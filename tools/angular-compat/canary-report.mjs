import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const toolRoot = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(toolRoot, '../..');

export const angularCanaryCommentMarker =
  '<!-- limitless-angular:angular-compat-canary -->';

export function readCanaryStatuses({
  downloadOutcome = 'success',
  statusDir = '.compat/canary-status',
} = {}) {
  const resolvedStatusDir = resolve(workspaceRoot, statusDir);
  if (downloadOutcome !== 'success' || !existsSync(resolvedStatusDir)) {
    return {
      statuses: [],
      warning: 'No Angular canary status artifacts were available to report.',
    };
  }

  const statuses = readdirSync(resolvedStatusDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => readCanaryStatus(resolve(resolvedStatusDir, file)))
    .filter(isCanaryStatus)
    .sort((left, right) => String(left.id).localeCompare(String(right.id)));

  if (statuses.length === 0) {
    return {
      statuses,
      warning: 'No Angular canary status JSON files were available to report.',
    };
  }

  return { statuses };
}

export function buildCanaryReport({
  runNumber,
  runUrl,
  statuses,
  workflowName,
}) {
  const failures = statuses.filter((status) => status.status === 'failed');
  const peerRange =
    statuses.find((status) => status.angularPeerRange)?.angularPeerRange ??
    'unknown';

  return {
    failures,
    peerRange,
    runNumber,
    runUrl,
    statuses,
    workflowName,
  };
}

export function buildCanarySummaryMarkdown(report) {
  return [
    '## Angular Canary Compatibility',
    '',
    `Supported peer range: \`${report.peerRange}\``,
    '',
    '| Canary set | Target | Tested versions | Result | First failure |',
    '| --- | --- | --- | --- | --- |',
    ...report.statuses.map(
      (status) =>
        `| ${tableCell(status.id)} | ${tableCell(formatCanaryTarget(status))} | ${tableCell(formatTestedVersions(status))} | ${status.status === 'failed' ? 'Failed' : 'Passed'} | ${tableCell(status.failureSummary ?? '')} |`,
    ),
    '',
  ].join('\n');
}

export function buildCanaryCommentBody(report) {
  if (report.failures.length === 0) {
    return undefined;
  }

  return [
    angularCanaryCommentMarker,
    '## Angular canary compatibility warning',
    '',
    'The advisory Angular canary compatibility check failed. This does not block the PR because canary targets are outside the currently required support matrix.',
    '',
    `Supported peer range: \`${report.peerRange}\``,
    formatWorkflowRunLine(report),
    '',
    '| Canary set | Target | Tested versions | First failure |',
    '| --- | --- | --- | --- |',
    ...report.failures.map(
      (failure) =>
        `| ${tableCell(failure.id)} | ${tableCell(formatCanaryTarget(failure))} | ${tableCell(formatTestedVersions(failure))} | ${tableCell(
          failure.failureSummary ??
            `compat:test exited with code ${failure.exitCode}`,
        )} |`,
    ),
    '',
    'Stable Angular compatibility rows remain required and will still fail CI if the declared peer range is broken.',
  ]
    .filter((line) => line !== undefined)
    .join('\n');
}

export function printCanaryReport(options = {}) {
  const loaded = readCanaryStatuses(options);
  if (loaded.warning) {
    console.log(loaded.warning);
    return;
  }

  const report = buildCanaryReport({
    runNumber: options.runNumber,
    runUrl: options.runUrl,
    statuses: loaded.statuses,
    workflowName: options.workflowName,
  });

  console.log(buildCanarySummaryMarkdown(report));

  const commentBody = buildCanaryCommentBody(report);
  if (commentBody) {
    console.log('--- PR comment ---');
    console.log(commentBody);
  }
}

export async function publishCanaryReportForGitHubScript({
  context,
  core,
  downloadOutcome = 'success',
  github,
  statusDir = '.compat/canary-status',
}) {
  const loaded = readCanaryStatuses({ downloadOutcome, statusDir });
  if (loaded.warning) {
    core.warning(loaded.warning);
    return;
  }

  const report = buildCanaryReport({
    runNumber: context.runNumber,
    runUrl: `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`,
    statuses: loaded.statuses,
    workflowName: context.workflow,
  });

  await core.summary.addRaw(buildCanarySummaryMarkdown(report)).write();

  for (const failure of report.failures) {
    const testedVersions = formatTestedVersions(failure);
    core.warning(
      `Angular canary compatibility failed for ${failure.id}${testedVersions ? ` (${testedVersions})` : ''}: ${sanitize(
        failure.failureSummary ??
          `compat:test exited with code ${failure.exitCode}`,
      )}`,
    );
  }

  const pullRequest = context.payload.pull_request;
  if (!pullRequest) {
    core.notice(
      'No pull request context is available; skipping sticky canary comment.',
    );
    return;
  }

  try {
    await syncCanaryComment({ context, core, github, pullRequest, report });
  } catch (error) {
    core.warning(
      `Unable to sync Angular canary advisory comment: ${error.message}`,
    );
  }
}

export async function syncCanaryComment({
  context,
  core,
  github,
  pullRequest,
  report,
}) {
  const commentParams = {
    owner: context.repo.owner,
    repo: context.repo.repo,
  };

  const comments = await github.paginate(github.rest.issues.listComments, {
    ...commentParams,
    issue_number: pullRequest.number,
    per_page: 100,
  });
  const managedComments = comments.filter((comment) =>
    comment.body?.includes(angularCanaryCommentMarker),
  );

  if (report.failures.length === 0) {
    for (const comment of managedComments) {
      await github.rest.issues.deleteComment({
        ...commentParams,
        comment_id: comment.id,
      });
    }
    core.notice(
      'Angular canary compatibility passed; no advisory comment is needed.',
    );
    return;
  }

  const body = buildCanaryCommentBody(report);
  if (managedComments[0]) {
    await github.rest.issues.updateComment({
      ...commentParams,
      body,
      comment_id: managedComments[0].id,
    });
  } else {
    await github.rest.issues.createComment({
      ...commentParams,
      body,
      issue_number: pullRequest.number,
    });
  }

  for (const duplicate of managedComments.slice(1)) {
    await github.rest.issues.deleteComment({
      ...commentParams,
      comment_id: duplicate.id,
    });
  }
}

export function formatCanaryTarget(status) {
  if (status.target) {
    return status.target;
  }

  const target = status.angular ?? status.angularMajor ?? status.npmTag;
  return target ? `Angular ${target}` : status.id;
}

export function formatTestedVersions(status) {
  const testedVersions = status.testedVersions;
  const parts = [
    ['Angular', testedVersions?.angular],
    ['CLI', testedVersions?.cli],
    ['TypeScript', testedVersions?.typescript],
  ]
    .filter(([, version]) => version)
    .map(([label, version]) => `${label} ${version}`);

  return parts.join(', ');
}

function readCanaryStatus(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function isCanaryStatus(value) {
  return (
    value &&
    typeof value.id === 'string' &&
    (value.status === 'passed' || value.status === 'failed')
  );
}

function formatWorkflowRunLine(report) {
  if (!report.runUrl) {
    return undefined;
  }

  const label =
    report.workflowName && report.runNumber
      ? `${report.workflowName} #${report.runNumber}`
      : 'workflow run';

  return `Workflow run: [${label}](${report.runUrl})`;
}

function tableCell(value) {
  return sanitize(value).replaceAll('|', '\\|');
}

function sanitize(value, maxLength = 500) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

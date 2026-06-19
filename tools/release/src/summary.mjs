import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const summaryTitles = {
  'dry-run': 'Release Dry Run Summary',
  publish: 'Release Process Summary',
  validation: 'Release Validation Summary',
};

export function renderReleaseSummary({ env = process.env } = {}) {
  const planResult = readJsonFile(env.RELEASE_PLAN_PATH);
  const notes = readTextFile(env.RELEASE_NOTES_PATH);
  const lines = [
    `## ${summaryTitles[env.RELEASE_MODE] ?? 'Release Summary'}`,
    '',
    `- Mode: ${env.RELEASE_MODE ?? 'unknown'}`,
    `- Outcome: ${env.RELEASE_OUTCOME ?? 'unknown'}`,
    `- Release intent input: ${env.RELEASE_INTENT ?? 'unknown'}`,
    `- Bump input: ${env.RELEASE_BUMP ?? 'unknown'}`,
    `- Allow major without prerelease: ${env.RELEASE_ALLOW_MAJOR_WITHOUT_PRERELEASE ?? 'unknown'}`,
    `- Manual version input: ${env.RELEASE_MANUAL_VERSION || 'none'}`,
  ];

  if (planResult.plan) {
    lines.push(...formatPlanLines(planResult.plan));
  } else {
    lines.push('- Planned version: unavailable; release planning did not complete.');

    if (planResult.reason) {
      lines.push(`- Release plan file: ${planResult.reason}.`);
    }
  }

  if (notes !== null) {
    lines.push(
      '',
      '## Future GitHub Release Notes',
      '',
      notes.trimEnd() || '_No release notes were generated._',
    );
  }

  return `${lines.join('\n')}\n`;
}

export function writeReleaseSummary({
  env = process.env,
  outputPath = env.GITHUB_STEP_SUMMARY,
} = {}) {
  if (!outputPath) {
    throw new Error('Missing GITHUB_STEP_SUMMARY path.');
  }

  writeFileSync(outputPath, renderReleaseSummary({ env }));
}

function formatPlanLines(plan) {
  return [
    `- Package: ${plan.packageName}`,
    `- Release intent: ${plan.releaseIntent}`,
    `- Release bump: ${plan.releaseBump}`,
    `- Planned version: ${plan.nextVersion}`,
    `- Release tag: ${plan.releaseTag}`,
    `- npm dist-tag: ${plan.npmDistTag}`,
    `- Head SHA: ${plan.headSha || 'unknown'}`,
    `- Commit count: ${plan.commitCount}`,
    `- Release notes base tag: ${plan.releaseNotesBaseTag || 'none'}`,
    `- Release note commit count: ${plan.releaseNotesCommitCount}`,
  ];
}

function readJsonFile(path) {
  if (!path || !existsSync(path)) {
    return { plan: null, reason: null };
  }

  const text = readFileSync(path, 'utf8').trim();

  if (!text) {
    return { plan: null, reason: 'empty' };
  }

  try {
    return { plan: JSON.parse(text), reason: null };
  } catch (error) {
    return { plan: null, reason: `invalid JSON (${error.message})` };
  }
}

function readTextFile(path) {
  if (!path || !existsSync(path)) {
    return null;
  }

  return readFileSync(path, 'utf8');
}

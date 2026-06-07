import { appendFileSync } from 'node:fs';

import { capture, config } from './lib.mjs';

const compatibilityPathRules = [
  { path: '.github/workflows/ci.yml', reason: 'CI workflow changed' },
  {
    path: '.github/workflows/release-and-publish.yml',
    reason: 'release workflow changed',
  },
  { path: '.nvmrc', reason: 'Node runtime changed' },
  { path: 'package.json', reason: 'root package manifest changed' },
  { path: 'pnpm-lock.yaml', reason: 'dependency lockfile changed' },
  { path: 'pnpm-workspace.yaml', reason: 'workspace layout changed' },
  { path: 'tsconfig.base.json', reason: 'shared TypeScript config changed' },
  { path: 'turbo.json', reason: 'Turbo pipeline changed' },
  {
    path: 'apps/sanity-presentation-e2e/package.json',
    reason: 'compat Playwright dependency source changed',
  },
  { path: 'packages/sanity/', reason: 'Sanity package changed' },
  { path: 'tools/angular-compat/', reason: 'compatibility harness changed' },
  { path: 'tools/scripts/release.ts', reason: 'release script changed' },
];

export function evaluateSanityCompatEligibility(options = {}) {
  const commandRunner = options.capture ?? capture;

  if (options.force) {
    return {
      run: true,
      reason: 'Forced by workflow_dispatch.',
    };
  }

  const baseRef = resolveBaseRef(options.baseRef, { capture: commandRunner });
  const headRef = options.headRef ?? 'HEAD';
  const changedFiles = options.changedFiles?.length
    ? normalizeChangedFiles(options.changedFiles)
    : readChangedFiles({ baseRef, capture: commandRunner, headRef });

  const matchedPaths = changedFiles
    .map((file) => ({ file, rule: matchCompatibilityPath(file) }))
    .filter((match) => match.rule);

  if (matchedPaths.length > 0) {
    return {
      run: true,
      reason: `Compatibility paths changed: ${matchedPaths
        .map(({ file }) => file)
        .join(', ')}`,
      changedFiles,
      matchedPaths,
    };
  }

  if (!baseRef) {
    return {
      run: true,
      reason: 'Unable to resolve a base ref; running compatibility checks.',
      changedFiles,
    };
  }

  const turboAffected = readTurboSanityAffected({
    baseRef,
    capture: commandRunner,
  });
  if (turboAffected.error) {
    return {
      run: true,
      reason: `Unable to evaluate Turbo affected state: ${turboAffected.error.message}`,
      changedFiles,
    };
  }

  if (turboAffected.tasks.length > 0) {
    return {
      run: true,
      reason: `Turbo reports ${config.packageName} is affected: ${turboAffected.tasks.join(', ')}`,
      changedFiles,
      turboTasks: turboAffected.tasks,
    };
  }

  return {
    run: false,
    reason: `No compatibility paths changed and Turbo reports ${config.packageName} is unaffected.`,
    changedFiles,
  };
}

export function printSanityCompatEligibility(options = {}) {
  const result = evaluateSanityCompatEligibility(options);

  console.log(`Sanity compatibility affected: ${result.run ? 'yes' : 'no'}`);
  console.log(`Reason: ${result.reason}`);

  if (result.changedFiles) {
    console.log('Changed files:');
    printList(result.changedFiles);
  }

  if (result.matchedPaths?.length) {
    console.log('Matched compatibility paths:');
    printList(
      result.matchedPaths.map(({ file, rule }) => `${file} (${rule.reason})`),
    );
  }

  if (result.turboTasks?.length) {
    console.log('Affected Turbo tasks:');
    printList(result.turboTasks);
  }

  if (options.githubOutput) {
    writeGitHubOutput(options.githubOutput, result);
  }

  return result;
}

function readChangedFiles({ baseRef, capture, headRef }) {
  if (!baseRef) {
    return [];
  }

  return normalizeChangedFiles(
    capture('git', ['diff', '--name-only', baseRef, headRef]).split('\n'),
  );
}

function readTurboSanityAffected({ baseRef, capture }) {
  try {
    const output = capture(
      'pnpm',
      [
        'turbo',
        'run',
        'build',
        'test',
        `--filter=${config.packageName}`,
        '--affected',
        '--dry=json',
      ],
      {
        env: {
          TURBO_SCM_BASE: baseRef,
        },
      },
    );
    const jsonStart = output.indexOf('{');
    if (jsonStart === -1) {
      throw new Error('Turbo dry run did not return JSON output');
    }

    const dryRun = JSON.parse(output.slice(jsonStart));
    const tasks = (dryRun.tasks ?? []).map((task) => task.taskId);

    return { tasks };
  } catch (error) {
    return { error };
  }
}

function matchCompatibilityPath(file) {
  return compatibilityPathRules.find((rule) =>
    rule.path.endsWith('/') ? file.startsWith(rule.path) : file === rule.path,
  );
}

function resolveBaseRef(baseRef, { capture }) {
  if (baseRef && isGitCommit(baseRef, { capture })) {
    return baseRef;
  }

  if (isGitCommit('origin/main', { capture })) {
    return 'origin/main';
  }

  return undefined;
}

function isGitCommit(ref, { capture }) {
  if (!ref) {
    return false;
  }

  try {
    capture('git', ['cat-file', '-e', `${ref}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

function normalizeChangedFiles(files) {
  const normalizedFiles = Array.isArray(files) ? files : [files];

  return [
    ...new Set(normalizedFiles.map((file) => file.trim()).filter(Boolean)),
  ];
}

function writeGitHubOutput(path, result) {
  appendFileSync(path, `run=${result.run ? 'true' : 'false'}\n`);
  appendFileSync(path, `reason=${sanitizeOutput(result.reason)}\n`);
}

function sanitizeOutput(value) {
  return String(value).replace(/\s+/g, ' ').trim();
}

function printList(items) {
  if (items.length === 0) {
    console.log('  none');
    return;
  }

  for (const item of items) {
    console.log(`  ${item}`);
  }
}

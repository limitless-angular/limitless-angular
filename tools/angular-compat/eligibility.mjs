import { appendFileSync } from 'node:fs';

import { capture, config, readJson } from './lib.mjs';

const compatibilityPackageName = readJson(
  new URL('./package.json', import.meta.url),
).name;
const affectedPackageNames = [config.packageName, compatibilityPackageName];
const compatibilityContractPathRules = [
  { path: '.github/workflows/ci.yml', reason: 'CI workflow changed' },
  {
    path: '.github/workflows/release-and-publish.yml',
    reason: 'release workflow changed',
  },
  {
    path: '.github/workflows/release-dry-run.yml',
    reason: 'release dry-run workflow changed',
  },
  { path: '.nvmrc', reason: 'Node runtime changed' },
  { path: 'turbo.json', reason: 'Turbo pipeline changed' },
  { path: 'tools/release/', reason: 'release tooling changed' },
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
      reason: `Compatibility contract paths changed: ${matchedPaths
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

  const turboAffected = readTurboCompatibilityAffected({
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
      reason: `Turbo reports compatibility packages are affected: ${turboAffected.tasks.join(', ')}`,
      changedFiles,
      turboTasks: turboAffected.tasks,
    };
  }

  return {
    run: false,
    reason: `No compatibility contract paths changed and Turbo reports ${affectedPackageNames.join(' and ')} are unaffected.`,
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
    console.log('Matched compatibility contract paths:');
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

function readTurboCompatibilityAffected({ baseRef, capture }) {
  try {
    const output = capture(
      'pnpm',
      [
        'turbo',
        'run',
        'build',
        'test',
        ...affectedPackageNames.map((packageName) => `--filter=${packageName}`),
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
    const tasks = (dryRun.tasks ?? [])
      .filter((task) => task.command && task.command !== '<NONEXISTENT>')
      .map((task) => task.taskId);

    return { tasks };
  } catch (error) {
    return { error };
  }
}

function matchCompatibilityPath(file) {
  return compatibilityContractPathRules.find((rule) =>
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

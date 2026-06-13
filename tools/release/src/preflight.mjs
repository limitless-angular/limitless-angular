import { capture as defaultCapture, run as defaultRun } from './commands.mjs';

const defaultReleaseBranch = 'main';
const npmRegistry = 'https://registry.npmjs.org';

export function assertPublishPreconditions(plan, options = {}) {
  const commandCapture = options.capture ?? defaultCapture;
  const commandRun = options.run ?? defaultRun;
  const env = { ...process.env, ...options.env };
  const releaseBranch = getReleaseBranch(env, options);

  assertGitHubReleaseToken(env);
  assertReleaseRef({ capture: commandCapture, env, releaseBranch });
  assertCleanWorktree(commandCapture);
  syncReleaseBranch(commandRun, releaseBranch);
  assertHeadMatchesRemote(commandCapture, releaseBranch);
  assertLocalReleaseTagAvailable(plan, commandCapture);
  assertRemoteReleaseTagAvailable(plan, commandCapture);
  assertNpmVersionAvailable(plan, commandCapture);
}

export function assertFinalPublishPreconditions(plan, options = {}) {
  const commandCapture = options.capture ?? defaultCapture;
  const commandRun = options.run ?? defaultRun;
  const env = { ...process.env, ...options.env };
  const releaseBranch = getReleaseBranch(env, options);

  syncReleaseBranch(commandRun, releaseBranch);
  assertRemoteBranchStillInHistory(commandCapture, releaseBranch);
  assertRemoteReleaseTagAvailable(plan, commandCapture);
  assertNpmVersionAvailable(plan, commandCapture);
}

function getReleaseBranch(env, options) {
  return options.releaseBranch ?? env.RELEASE_BRANCH ?? defaultReleaseBranch;
}

function assertGitHubReleaseToken(env) {
  if (!env.GITHUB_TOKEN) {
    throw new Error(
      'Refusing to publish without GITHUB_TOKEN; publish mode must be able to create the GitHub release.',
    );
  }
}

function assertReleaseRef({ capture, env, releaseBranch }) {
  const expectedGitHubRef = `refs/heads/${releaseBranch}`;

  if (env.GITHUB_REF) {
    if (env.GITHUB_REF !== expectedGitHubRef) {
      throw new Error(
        `Refusing to publish from ${env.GITHUB_REF}; expected ${expectedGitHubRef}.`,
      );
    }

    return;
  }

  const currentBranch = capture('git', ['branch', '--show-current']).trim();
  if (currentBranch !== releaseBranch) {
    throw new Error(
      `Refusing to publish from branch ${currentBranch || 'detached HEAD'}; expected ${releaseBranch}.`,
    );
  }
}

function assertCleanWorktree(capture) {
  const status = capture('git', ['status', '--porcelain']).trim();
  if (status) {
    throw new Error('Refusing to publish with uncommitted workspace changes.');
  }
}

function syncReleaseBranch(run, releaseBranch) {
  run('git', [
    'fetch',
    'origin',
    `refs/heads/${releaseBranch}:refs/remotes/origin/${releaseBranch}`,
    '--tags',
  ]);
}

function assertHeadMatchesRemote(capture, releaseBranch) {
  const head = capture('git', ['rev-parse', 'HEAD']).trim();
  const remoteHead = capture('git', [
    'rev-parse',
    `origin/${releaseBranch}`,
  ]).trim();

  if (head !== remoteHead) {
    throw new Error(
      `Refusing to publish because HEAD (${head}) does not match origin/${releaseBranch} (${remoteHead}).`,
    );
  }
}

function assertRemoteBranchStillInHistory(capture, releaseBranch) {
  const remoteHead = capture('git', [
    'rev-parse',
    `origin/${releaseBranch}`,
  ]).trim();
  const mergeBase = capture('git', [
    'merge-base',
    'HEAD',
    `origin/${releaseBranch}`,
  ]).trim();

  if (mergeBase !== remoteHead) {
    throw new Error(
      `Refusing to publish because origin/${releaseBranch} moved after validation.`,
    );
  }
}

function assertLocalReleaseTagAvailable(plan, capture) {
  if (
    commandSucceeds(capture, 'git', [
      'rev-parse',
      '--verify',
      `refs/tags/${plan.releaseTag}`,
    ])
  ) {
    throw new Error(
      `Refusing to publish because local tag ${plan.releaseTag} already exists.`,
    );
  }
}

function assertRemoteReleaseTagAvailable(plan, capture) {
  if (
    commandSucceeds(capture, 'git', [
      'ls-remote',
      '--exit-code',
      '--tags',
      'origin',
      `refs/tags/${plan.releaseTag}`,
    ])
  ) {
    throw new Error(
      `Refusing to publish because remote tag ${plan.releaseTag} already exists.`,
    );
  }
}

function assertNpmVersionAvailable(plan, capture) {
  const output = capture('npm', [
    'view',
    plan.packageName,
    'versions',
    '--json',
    '--registry',
    npmRegistry,
  ]);
  const versions = normalizeNpmVersions(JSON.parse(output));

  if (versions.includes(plan.nextVersion)) {
    throw new Error(
      `Refusing to publish because ${plan.packageName}@${plan.nextVersion} already exists on npm.`,
    );
  }
}

function normalizeNpmVersions(value) {
  if (Array.isArray(value)) {
    return value;
  }

  return value ? [value] : [];
}

function commandSucceeds(capture, command, args) {
  try {
    capture(command, args);
    return true;
  } catch {
    return false;
  }
}

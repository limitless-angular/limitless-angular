import { capture as defaultCapture, run as defaultRun } from './commands.mjs';
import { repoUrl } from './config.mjs';
import {
  getHeadSha,
  getLocalReleaseTagTarget,
  getRemoteReleaseTagTarget,
  npmVersionExists,
} from './state.mjs';

const defaultReleaseBranch = 'main';

export function assertPublishPreconditions(plan, options = {}) {
  const commandCapture = options.capture ?? defaultCapture;
  const commandRun = options.run ?? defaultRun;
  const env = { ...process.env, ...options.env };
  const releaseBranch = getReleaseBranch(env, options);

  assertGitHubReleaseToken(env);
  assertGitHubOidcRequest(env);
  assertReleaseRef({ capture: commandCapture, env, releaseBranch });
  assertTrustedPublishingRepository(plan);
  assertCleanWorktree(commandCapture);
  syncReleaseBranch(commandRun, releaseBranch);
  assertHeadMatchesRemote(commandCapture, releaseBranch);
  assertReleaseTagDoesNotPointElsewhere(plan, commandCapture);
  assertNpmVersionDoesNotExistWithoutRemoteTag(plan, commandCapture);
}

export function assertFinalPublishPreconditions(plan, options = {}) {
  const commandCapture = options.capture ?? defaultCapture;
  const commandRun = options.run ?? defaultRun;
  const env = { ...process.env, ...options.env };
  const releaseBranch = getReleaseBranch(env, options);

  syncReleaseBranch(commandRun, releaseBranch);
  assertRemoteBranchStillInHistory(commandCapture, releaseBranch);
  assertReleaseTagDoesNotPointElsewhere(plan, commandCapture);
  assertNpmVersionDoesNotExistWithoutRemoteTag(plan, commandCapture);
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

function assertGitHubOidcRequest(env) {
  if (
    !env.ACTIONS_ID_TOKEN_REQUEST_URL ||
    !env.ACTIONS_ID_TOKEN_REQUEST_TOKEN
  ) {
    throw new Error(
      'Refusing to publish without GitHub Actions OIDC request environment variables; verify id-token: write and the release:publish Turbo passThroughEnv configuration.',
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

function assertTrustedPublishingRepository(plan) {
  if (plan.packageRepositoryUrl !== repoUrl) {
    throw new Error(
      `Refusing to publish because package repository.url ${formatValue(plan.packageRepositoryUrl)} must exactly match ${repoUrl} for npm trusted publishing.`,
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

function assertReleaseTagDoesNotPointElsewhere(plan, capture) {
  const head = getHeadSha({ capture });
  const localTagTarget = getLocalReleaseTagTarget(plan, { capture });
  const remoteTagTarget = getRemoteReleaseTagTarget(plan, { capture });

  if (localTagTarget && localTagTarget !== head) {
    throw new Error(
      `Refusing to publish because local tag ${plan.releaseTag} points to ${localTagTarget}, not HEAD ${head}.`,
    );
  }

  if (remoteTagTarget && remoteTagTarget !== head) {
    throw new Error(
      `Refusing to publish because remote tag ${plan.releaseTag} points to ${remoteTagTarget}, not HEAD ${head}.`,
    );
  }
}

function assertNpmVersionDoesNotExistWithoutRemoteTag(plan, capture) {
  const remoteTagTarget = getRemoteReleaseTagTarget(plan, { capture });

  if (npmVersionExists(plan, { capture }) && !remoteTagTarget) {
    throw new Error(
      `Refusing to publish because ${plan.packageName}@${plan.nextVersion} already exists on npm but ${plan.releaseTag} is not on GitHub.`,
    );
  }
}

function formatValue(value) {
  return value ? JSON.stringify(value) : 'is missing';
}

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { capture as defaultCapture, run as defaultRun } from './commands.mjs';
import {
  assertNpmDistTag,
  getHeadSha,
  getLocalReleaseTagTarget,
  getRemoteReleaseTagTarget,
  npmRegistry,
  npmVersionExists,
} from './state.mjs';
import { retry } from './retry.mjs';

const npmPublishVerificationRetry = {
  attempts: 6,
  delayMs: 5_000,
  factor: 2,
  maxDelayMs: 30_000,
};

export function ensureReleaseTag(plan, options = {}) {
  const commandCapture = options.capture ?? defaultCapture;
  const commandRun = options.run ?? defaultRun;
  const head = getHeadSha({ capture: commandCapture });
  const localTagTarget = getLocalReleaseTagTarget(plan, {
    capture: commandCapture,
  });
  const remoteTagTarget = getRemoteReleaseTagTarget(plan, {
    capture: commandCapture,
  });

  assertTagTarget(plan, localTagTarget, head, 'local');
  assertTagTarget(plan, remoteTagTarget, head, 'remote');

  if (!localTagTarget && !remoteTagTarget) {
    commandRun('git', [
      'tag',
      '-a',
      plan.releaseTag,
      '-m',
      plan.releaseTag,
      'HEAD',
    ]);
  }

  if (!remoteTagTarget) {
    commandRun('git', ['push', 'origin', `refs/tags/${plan.releaseTag}`]);
  }

  const verifiedRemoteTagTarget = getRemoteReleaseTagTarget(plan, {
    capture: commandCapture,
  });

  if (verifiedRemoteTagTarget !== head) {
    throw new Error(
      `Expected remote tag ${plan.releaseTag} to point to HEAD ${head}, found ${verifiedRemoteTagTarget ?? 'nothing'}.`,
    );
  }

  return !remoteTagTarget;
}

export function publishTarball(plan, tarballPath, options = {}) {
  const commandCapture = options.capture ?? defaultCapture;
  const commandRun = options.run ?? defaultRun;
  const retryOptions =
    options.npmPublishVerificationRetry ?? npmPublishVerificationRetry;

  if (npmVersionExists(plan, { capture: commandCapture })) {
    waitForNpmPublishedState(plan, {
      capture: commandCapture,
      retryOptions,
    });
    console.log(
      `Skipping npm publish because ${plan.packageName}@${plan.nextVersion} already exists.`,
    );
    return false;
  }

  const args = [
    'publish',
    tarballPath,
    '--access',
    'public',
    '--registry',
    npmRegistry,
  ];

  if (plan.npmDistTag && plan.npmDistTag !== 'latest') {
    args.push('--tag', plan.npmDistTag);
  }

  commandRun('npm', args);

  waitForNpmPublishedState(plan, {
    capture: commandCapture,
    retryOptions,
  });
  return true;
}

function waitForNpmPublishedState(plan, { capture, retryOptions }) {
  retry(() => {
    if (!npmVersionExists(plan, { capture })) {
      throw new Error(
        `Published ${plan.packageName}@${plan.nextVersion}, but npm did not return that version.`,
      );
    }

    assertNpmDistTag(plan, { capture });
  }, retryOptions);
}

export function createGitHubRelease(plan, options = {}) {
  const commandCapture = options.capture ?? defaultCapture;
  const commandRun = options.run ?? defaultRun;
  const env = { ...process.env, ...options.env };

  if (!env.GITHUB_TOKEN) {
    throw new Error('Missing GITHUB_TOKEN; cannot create the GitHub release.');
  }

  const existingRelease = getGitHubRelease(plan, {
    capture: commandCapture,
    env,
  });

  if (existingRelease) {
    assertGitHubReleaseMatchesPlan(plan, existingRelease);
    console.log(
      `Skipping GitHub release because ${plan.releaseTag} already exists.`,
    );
    return false;
  }

  const tempDir = mkdtempSync(join(tmpdir(), 'limitless-release-'));
  const notesPath = join(tempDir, 'notes.md');

  try {
    writeFileSync(notesPath, plan.releaseNotes);
    const args = [
      'release',
      'create',
      plan.releaseTag,
      '--title',
      plan.releaseTag,
      '--notes-file',
      notesPath,
      '--verify-tag',
    ];

    if (plan.prerelease) {
      args.push('--prerelease');
    }

    commandRun('gh', args, { env });
    assertGitHubReleaseMatchesPlan(
      plan,
      getGitHubRelease(plan, { capture: commandCapture, env }),
    );
    return true;
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

function getGitHubRelease(plan, { capture, env }) {
  try {
    const output = capture(
      'gh',
      [
        'release',
        'view',
        plan.releaseTag,
        '--json',
        'tagName,isPrerelease,isDraft,url',
      ],
      { env },
    ).trim();

    return output ? JSON.parse(output) : null;
  } catch {
    return null;
  }
}

function assertGitHubReleaseMatchesPlan(plan, release) {
  if (!release) {
    throw new Error(`GitHub release ${plan.releaseTag} does not exist.`);
  }

  if (release.tagName !== plan.releaseTag) {
    throw new Error(
      `Expected GitHub release tag ${plan.releaseTag}, found ${release.tagName}.`,
    );
  }

  if (release.isDraft) {
    throw new Error(`GitHub release ${plan.releaseTag} must not be a draft.`);
  }

  if (release.isPrerelease !== plan.prerelease) {
    throw new Error(
      `Expected GitHub release ${plan.releaseTag} prerelease=${plan.prerelease}, found ${release.isPrerelease}.`,
    );
  }
}

function assertTagTarget(plan, target, head, source) {
  if (target && target !== head) {
    throw new Error(
      `Refusing to publish because ${source} tag ${plan.releaseTag} points to ${target}, not HEAD ${head}.`,
    );
  }
}

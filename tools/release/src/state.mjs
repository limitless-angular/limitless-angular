import { capture as defaultCapture } from './commands.mjs';

export const npmRegistry = 'https://registry.npmjs.org';

export function getHeadSha(options = {}) {
  const commandCapture = options.capture ?? defaultCapture;

  return commandCapture('git', ['rev-parse', 'HEAD']).trim();
}

export function getLocalReleaseTagTarget(plan, options = {}) {
  const commandCapture = options.capture ?? defaultCapture;

  try {
    return commandCapture('git', ['rev-parse', `${plan.releaseTag}^{}`]).trim();
  } catch {
    return null;
  }
}

export function getRemoteReleaseTagTarget(plan, options = {}) {
  const commandCapture = options.capture ?? defaultCapture;
  const peeledTarget = captureRemoteTagTarget(commandCapture, [
    `refs/tags/${plan.releaseTag}^{}`,
  ]);

  if (peeledTarget) {
    return peeledTarget;
  }

  return captureRemoteTagTarget(commandCapture, [
    `refs/tags/${plan.releaseTag}`,
  ]);
}

export function npmVersionExists(plan, options = {}) {
  return getNpmVersions(plan, options).includes(plan.nextVersion);
}

export function getNpmDistTags(plan, options = {}) {
  const commandCapture = options.capture ?? defaultCapture;
  const output = commandCapture('npm', [
    'view',
    plan.packageName,
    'dist-tags',
    '--json',
    '--registry',
    npmRegistry,
  ]).trim();

  return output ? JSON.parse(output) : {};
}

export function assertNpmDistTag(plan, options = {}) {
  const distTags = getNpmDistTags(plan, options);
  const actualVersion = distTags[plan.npmDistTag];

  if (actualVersion !== plan.nextVersion) {
    throw new Error(
      `Expected npm dist-tag ${plan.npmDistTag} to point to ${plan.nextVersion}, found ${actualVersion ?? 'nothing'}.`,
    );
  }
}

function getNpmVersions(plan, options = {}) {
  const commandCapture = options.capture ?? defaultCapture;
  const output = commandCapture('npm', [
    'view',
    plan.packageName,
    'versions',
    '--json',
    '--registry',
    npmRegistry,
  ]).trim();
  const versions = JSON.parse(output);

  if (Array.isArray(versions)) {
    return versions;
  }

  return versions ? [versions] : [];
}

function captureRemoteTagTarget(capture, refPatterns) {
  try {
    const output = capture('git', [
      'ls-remote',
      '--exit-code',
      '--tags',
      'origin',
      ...refPatterns,
    ]).trim();

    return output.split(/\s+/)[0] ?? null;
  } catch {
    return null;
  }
}

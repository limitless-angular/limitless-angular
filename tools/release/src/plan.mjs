import semver from 'semver';

import {
  initialReleaseVersion,
  packageJsonPath,
  releaseTagPrefix,
  repoUrl,
} from './config.mjs';
import { capture as defaultCapture } from './commands.mjs';
import { readJson } from './files.mjs';

const prereleaseIdentifier = 'next';
const prereleaseNpmDistTag = 'next';
const stableNpmDistTag = 'latest';

export function createReleasePlan(options = {}) {
  const paths = resolveReleasePaths(options.paths);
  const commandCapture = options.capture ?? defaultCapture;
  const packageJson = readJson(paths.packageJsonPath);
  const packageRepositoryUrl = getRepositoryUrl(packageJson.repository);
  const resolvedReleaseTagPrefix = options.releaseTagPrefix ?? releaseTagPrefix;
  const releaseTags = getReachableReleaseTags({
    capture: commandCapture,
    releaseTagPrefix: resolvedReleaseTagPrefix,
  });
  const headReleaseTag = getHeadReleaseTags({
    capture: commandCapture,
    releaseTagPrefix: resolvedReleaseTagPrefix,
  })[0];
  const latestReleaseTag = releaseTags[0] ?? null;
  const releaseBaseTag = headReleaseTag
    ? (releaseTags.find((tag) => tag.tag !== headReleaseTag.tag) ?? null)
    : latestReleaseTag;
  const currentVersion = releaseBaseTag?.version ?? initialReleaseVersion;
  const latestTag = releaseBaseTag?.tag ?? null;
  const commits = getCommitsSince(latestTag, { capture: commandCapture });
  const requestedNextVersion = resolveNextVersion(currentVersion, commits, {
    prerelease: options.prerelease,
    versionSpecifier: options.versionSpecifier,
  });
  const nextVersion = headReleaseTag?.version ?? requestedNextVersion;

  if (!nextVersion) {
    throw new Error(
      'No release version could be determined. Pass --version or add a conventional commit with feat, fix, perf, refactor, or a breaking change.',
    );
  }

  if (
    headReleaseTag &&
    requestedNextVersion &&
    requestedNextVersion !== nextVersion
  ) {
    throw new Error(
      `HEAD is already tagged for ${headReleaseTag.tag}; refusing to plan ${requestedNextVersion}.`,
    );
  }

  if (!headReleaseTag && !semver.gt(nextVersion, currentVersion)) {
    throw new Error(
      `Refusing to release ${nextVersion}; it must be greater than the current version ${currentVersion}.`,
    );
  }

  const generatedAt = options.now ?? new Date();
  const releaseTag =
    headReleaseTag?.tag ?? `${resolvedReleaseTagPrefix}${nextVersion}`;
  const isPrerelease = Boolean(semver.prerelease(nextVersion));
  const releaseNotes = buildReleaseNotes(nextVersion, commits, {
    now: generatedAt,
  });

  return {
    commits,
    currentVersion,
    existingReleaseTag: Boolean(headReleaseTag),
    generatedAt: generatedAt.toISOString(),
    latestTag,
    nextVersion,
    npmDistTag: isPrerelease ? prereleaseNpmDistTag : stableNpmDistTag,
    packageName: packageJson.name,
    packageRepositoryUrl,
    paths,
    prerelease: isPrerelease,
    releaseNotes,
    releaseTag,
    sourceVersion: packageJson.version,
  };
}

export function resolveReleaseSpecifier(
  currentVersion,
  specifier,
  options = {},
) {
  return resolveVersionSpecifier(currentVersion, specifier, options);
}

export function summarizeReleasePlan(plan) {
  return {
    commitCount: plan.commits.length,
    currentVersion: plan.currentVersion,
    existingReleaseTag: plan.existingReleaseTag,
    generatedAt: plan.generatedAt,
    latestTag: plan.latestTag,
    nextVersion: plan.nextVersion,
    npmDistTag: plan.npmDistTag,
    packageName: plan.packageName,
    prerelease: plan.prerelease,
    releaseTag: plan.releaseTag,
  };
}

export function printReleasePlan(plan) {
  const summary = summarizeReleasePlan(plan);

  console.log(`Package: ${summary.packageName}`);
  console.log(`Current version: ${summary.currentVersion}`);
  console.log(`Latest tag: ${summary.latestTag ?? 'none'}`);
  console.log(`Next version: ${summary.nextVersion}`);
  console.log(`npm dist-tag: ${summary.npmDistTag}`);
  console.log(`Release tag: ${summary.releaseTag}`);
  console.log(`Release commits: ${summary.commitCount}`);
}

function resolveReleasePaths(paths = {}) {
  return {
    packageJsonPath: paths.packageJsonPath ?? packageJsonPath,
  };
}

function resolveNextVersion(currentVersion, commits, options = {}) {
  return options.versionSpecifier
    ? resolveVersionSpecifier(currentVersion, options.versionSpecifier, {
        prerelease: options.prerelease,
      })
    : inferVersionFromCommits(currentVersion, commits, {
        prerelease: options.prerelease,
      });
}

function getRepositoryUrl(repository) {
  if (typeof repository === 'string') {
    return repository;
  }

  return repository?.url;
}

function resolveVersionSpecifier(currentVersion, specifier, options = {}) {
  const trimmedSpecifier = specifier.trim();

  if (semver.valid(trimmedSpecifier)) {
    if (options.prerelease && !semver.prerelease(trimmedSpecifier)) {
      return appendPrereleaseIdentifier(trimmedSpecifier);
    }

    return trimmedSpecifier;
  }

  if (options.prerelease) {
    const prereleaseIncrement = toPrereleaseIncrement(trimmedSpecifier);

    if (prereleaseIncrement) {
      return semver.inc(
        currentVersion,
        prereleaseIncrement,
        prereleaseIdentifier,
      );
    }
  }

  return semver.inc(currentVersion, trimmedSpecifier);
}

function inferVersionFromCommits(currentVersion, commits, options = {}) {
  const releaseType = inferReleaseTypeFromCommits(commits);

  if (options.prerelease) {
    return inferPrereleaseVersion(currentVersion, releaseType);
  }

  return releaseType ? semver.inc(currentVersion, releaseType) : null;
}

function inferReleaseTypeFromCommits(commits) {
  if (commits.some(isBreakingCommit)) {
    return 'major';
  }

  if (commits.some((commit) => getCommitType(commit) === 'feat')) {
    return 'minor';
  }

  if (
    commits.some((commit) =>
      ['fix', 'perf', 'refactor'].includes(getCommitType(commit) ?? ''),
    )
  ) {
    return 'patch';
  }

  return null;
}

function inferPrereleaseVersion(currentVersion, releaseType) {
  if (!releaseType) {
    return null;
  }

  if (semver.prerelease(currentVersion)) {
    return semver.inc(currentVersion, 'prerelease', prereleaseIdentifier);
  }

  return semver.inc(currentVersion, `pre${releaseType}`, prereleaseIdentifier);
}

function appendPrereleaseIdentifier(version) {
  const prereleaseVersion = `${version}-${prereleaseIdentifier}.0`;

  if (!semver.valid(prereleaseVersion)) {
    throw new Error(`Could not create prerelease version from ${version}.`);
  }

  return prereleaseVersion;
}

function toPrereleaseIncrement(specifier) {
  switch (specifier) {
    case 'major':
    case 'minor':
    case 'patch':
      return `pre${specifier}`;
    case 'premajor':
    case 'preminor':
    case 'prepatch':
    case 'prerelease':
      return specifier;
    default:
      return null;
  }
}

function getReachableReleaseTags({ capture, releaseTagPrefix }) {
  try {
    return parseReleaseTags(
      capture('git', [
        'tag',
        '--merged',
        'HEAD',
        '--list',
        `${releaseTagPrefix}*`,
      ]),
      releaseTagPrefix,
    );
  } catch {
    return [];
  }
}

function getHeadReleaseTags({ capture, releaseTagPrefix }) {
  try {
    return parseReleaseTags(
      capture('git', [
        'tag',
        '--points-at',
        'HEAD',
        '--list',
        `${releaseTagPrefix}*`,
      ]),
      releaseTagPrefix,
    );
  } catch {
    return [];
  }
}

function parseReleaseTags(output, releaseTagPrefix) {
  return output
    .trim()
    .split('\n')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => ({
      tag,
      version: semver.valid(tag.slice(releaseTagPrefix.length)),
    }))
    .filter((tag) => tag.version)
    .sort((a, b) => semver.rcompare(a.version, b.version));
}

function getCommitsSince(tag, { capture }) {
  const range = tag ? `${tag}..HEAD` : 'HEAD';
  const output = capture('git', [
    'log',
    range,
    '--pretty=format:%H%x01%s%x01%b%x01%an%x02',
  ]).trim();

  if (!output) {
    return [];
  }

  return output
    .split('\x02')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [hash = '', subject = '', body = '', author = ''] =
        entry.split('\x01');

      return { author, body, hash, subject };
    });
}

function buildReleaseNotes(version, commits, { now }) {
  const groupedCommits = commits.reduce(
    (groups, commit) => {
      if (isBreakingCommit(commit)) {
        groups.breaking.push(commit);
        return groups;
      }

      switch (getCommitType(commit)) {
        case 'feat':
          groups.features.push(commit);
          break;
        case 'fix':
        case 'perf':
          groups.fixes.push(commit);
          break;
        case 'refactor':
          groups.refactors.push(commit);
          break;
      }

      return groups;
    },
    { breaking: [], features: [], fixes: [], refactors: [] },
  );
  const sections = [
    formatCommitGroup('### 🚀 Features', groupedCommits.features),
    formatCommitGroup('### 🩹 Fixes', groupedCommits.fixes),
    formatCommitGroup('### 🧹 Refactors', groupedCommits.refactors),
    formatCommitGroup('### ⚠️ Breaking Changes', groupedCommits.breaking),
    formatAuthors(commits),
  ].filter(Boolean);

  return [`## ${version} (${now.toISOString().slice(0, 10)})`, ...sections]
    .join('\n\n')
    .concat('\n');
}

function formatCommitGroup(title, commits) {
  if (commits.length === 0) {
    return null;
  }

  return [
    title,
    '',
    ...commits.map(
      (commit) =>
        `- ${formatCommitSubject(commit.subject)} ([${commit.hash.slice(0, 7)}](${repoUrl}/commit/${commit.hash}))`,
    ),
  ].join('\n');
}

function formatAuthors(commits) {
  const authors = [
    ...new Set(commits.map((commit) => commit.author).filter(Boolean)),
  ];

  if (authors.length === 0) {
    return null;
  }

  return [
    '### ❤️ Thank You',
    '',
    ...authors.map((author) => `- ${author}`),
  ].join('\n');
}

function formatCommitSubject(subject) {
  return subject.replace(/^\w+(?:\([^)]+\))?!?:\s*/, '');
}

function getCommitType(commit) {
  return commit.subject.match(/^(\w+)(?:\([^)]+\))?!?:/)?.[1] ?? null;
}

function isBreakingCommit(commit) {
  return (
    /^\w+(?:\([^)]+\))!:/.test(commit.subject) ||
    /BREAKING CHANGE:/i.test(commit.body)
  );
}

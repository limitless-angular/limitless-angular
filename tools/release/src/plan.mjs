import semver from 'semver';

import {
  changelogPath,
  packageJsonPath,
  releaseTagPrefix,
  repoUrl,
} from './config.mjs';
import { capture as defaultCapture } from './commands.mjs';
import { readJson } from './files.mjs';

export function createReleasePlan(options = {}) {
  const paths = resolveReleasePaths(options.paths);
  const commandCapture = options.capture ?? defaultCapture;
  const packageJson = readJson(paths.packageJsonPath);
  const currentVersion = packageJson.version;
  const latestTag = getLatestTag(currentVersion, {
    capture: commandCapture,
    releaseTagPrefix: options.releaseTagPrefix ?? releaseTagPrefix,
  });
  const commits = getCommitsSince(latestTag, { capture: commandCapture });
  const nextVersion = options.versionSpecifier
    ? resolveVersionSpecifier(currentVersion, options.versionSpecifier)
    : inferVersionFromCommits(currentVersion, commits);

  if (!nextVersion) {
    throw new Error(
      'No release version could be determined. Pass --version or add a conventional commit with feat, fix, perf, refactor, or a breaking change.',
    );
  }

  if (nextVersion === currentVersion) {
    throw new Error(`Refusing to release unchanged version ${currentVersion}.`);
  }

  const resolvedReleaseTagPrefix = options.releaseTagPrefix ?? releaseTagPrefix;
  const generatedAt = options.now ?? new Date();
  const releaseTag = `${resolvedReleaseTagPrefix}${nextVersion}`;

  return {
    changelogSection: buildChangelogSection(nextVersion, commits, {
      now: generatedAt,
    }),
    commits,
    currentVersion,
    generatedAt: generatedAt.toISOString(),
    latestTag,
    nextVersion,
    packageName: packageJson.name,
    paths,
    releaseTag,
  };
}

export function resolveReleaseSpecifier(currentVersion, specifier) {
  return resolveVersionSpecifier(currentVersion, specifier);
}

export function summarizeReleasePlan(plan) {
  return {
    commitCount: plan.commits.length,
    currentVersion: plan.currentVersion,
    generatedAt: plan.generatedAt,
    latestTag: plan.latestTag,
    nextVersion: plan.nextVersion,
    packageName: plan.packageName,
    releaseTag: plan.releaseTag,
  };
}

export function printReleasePlan(plan) {
  const summary = summarizeReleasePlan(plan);

  console.log(`Package: ${summary.packageName}`);
  console.log(`Current version: ${summary.currentVersion}`);
  console.log(`Latest tag: ${summary.latestTag ?? 'none'}`);
  console.log(`Next version: ${summary.nextVersion}`);
  console.log(`Release tag: ${summary.releaseTag}`);
  console.log(`Release commits: ${summary.commitCount}`);
}

function resolveReleasePaths(paths = {}) {
  return {
    changelogPath: paths.changelogPath ?? changelogPath,
    packageJsonPath: paths.packageJsonPath ?? packageJsonPath,
  };
}

function resolveVersionSpecifier(currentVersion, specifier) {
  const trimmedSpecifier = specifier.trim();

  if (semver.valid(trimmedSpecifier)) {
    return trimmedSpecifier;
  }

  return semver.inc(currentVersion, trimmedSpecifier);
}

function inferVersionFromCommits(currentVersion, commits) {
  if (commits.some(isBreakingCommit)) {
    return semver.inc(currentVersion, 'major');
  }

  if (commits.some((commit) => getCommitType(commit) === 'feat')) {
    return semver.inc(currentVersion, 'minor');
  }

  if (
    commits.some((commit) =>
      ['fix', 'perf', 'refactor'].includes(getCommitType(commit) ?? ''),
    )
  ) {
    return semver.inc(currentVersion, 'patch');
  }

  return null;
}

function getLatestTag(currentVersion, { capture, releaseTagPrefix }) {
  const currentTag = `${releaseTagPrefix}${currentVersion}`;

  if (commandSucceeds('git', ['rev-parse', '--verify', currentTag], capture)) {
    return currentTag;
  }

  try {
    return capture('git', [
      'describe',
      '--tags',
      '--abbrev=0',
      `--match=${releaseTagPrefix}*`,
    ]).trim();
  } catch {
    return null;
  }
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

function buildChangelogSection(version, commits, { now }) {
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

function commandSucceeds(command, args, capture) {
  try {
    capture(command, args);
    return true;
  } catch {
    return false;
  }
}

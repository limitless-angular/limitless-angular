import { isDeepStrictEqual } from 'node:util';

import semver from 'semver';

import {
  defaultReleasePackage,
  initialReleaseVersion,
  repoUrl,
} from './config.mjs';
import { capture as defaultCapture } from './commands.mjs';
import { readJson } from './files.mjs';

const prereleaseIdentifier = 'next';
const prereleaseNpmDistTag = 'next';
const stableNpmDistTag = 'latest';
const missingJsonFile = Symbol('missingJsonFile');
const invalidJsonFile = Symbol('invalidJsonFile');

export const releaseIntents = {
  manual: 'manual',
  prerelease: 'prerelease',
  promoteStable: 'promote-stable',
  stable: 'stable',
};

export const releaseBumps = {
  auto: 'auto',
  major: 'major',
  minor: 'minor',
  patch: 'patch',
};

export const comparableReleasePlanSummaryFields = [
  'commitCount',
  'currentVersion',
  'headSha',
  'latestTag',
  'nextVersion',
  'npmDistTag',
  'packageName',
  'prerelease',
  'releaseBump',
  'releaseIntent',
  'releaseNotesBaseTag',
  'releaseNotesCommitCount',
  'releaseTag',
];

export function createReleasePlan(options = {}) {
  assertSupportedReleaseOptions(options);

  const releasePackage = options.releasePackage ?? defaultReleasePackage;
  const paths = resolveReleasePaths(options.paths, releasePackage);
  const commandCapture = options.capture ?? defaultCapture;
  const packageJson = readJson(paths.packageJsonPath);
  const packageRepositoryUrl = getRepositoryUrl(packageJson.repository);
  const resolvedReleaseTagPrefix =
    options.releaseTagPrefix ?? releasePackage.releaseTagPrefix;
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
  const allCommits = getCommitsSince(latestTag, { capture: commandCapture });
  const commits = filterReleaseCommits(allCommits, releasePackage);
  const releaseRequest = resolveReleaseRequest({
    commits,
    currentVersion,
    headReleaseTag,
    latestReleaseTag,
    options,
    releaseBaseTag,
    releasePackage,
  });
  const requestedNextVersion = releaseRequest.nextVersion;
  const nextVersion = headReleaseTag?.version ?? requestedNextVersion;

  if (
    headReleaseTag &&
    releaseRequest.expectedPrerelease !== undefined &&
    Boolean(semver.prerelease(headReleaseTag.version)) !==
      releaseRequest.expectedPrerelease
  ) {
    throw new Error(
      `HEAD is already tagged for ${headReleaseTag.tag}; refusing to plan ${releaseRequest.releaseIntent}.`,
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

  if (!nextVersion) {
    throw new Error(
      `No release version could be determined for ${releasePackage.name}. Pass an explicit release intent or add a package-relevant conventional commit with feat, fix, perf, refactor, or a breaking change.`,
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
  const releaseNotesBaseTag = resolveReleaseNotesBaseTag({
    headReleaseTag,
    prerelease: isPrerelease,
    releaseBaseTag,
    releaseTags,
  });
  const releaseNotesCommits =
    releaseNotesBaseTag === latestTag
      ? commits
      : filterReleaseCommits(
          getCommitsSince(releaseNotesBaseTag, { capture: commandCapture }),
          releasePackage,
        );
  const releaseNotes = buildReleaseNotes(nextVersion, releaseNotesCommits, {
    now: generatedAt,
  });

  return {
    commits,
    currentVersion,
    existingReleaseTag: Boolean(headReleaseTag),
    generatedAt: generatedAt.toISOString(),
    headSha: getHeadSha({ capture: commandCapture }),
    latestTag,
    nextVersion,
    npmDistTag: isPrerelease ? prereleaseNpmDistTag : stableNpmDistTag,
    packageName: packageJson.name,
    packageRepositoryUrl,
    releasePackage,
    paths,
    prerelease: isPrerelease,
    releaseBump: releaseRequest.releaseBump,
    releaseIntent: releaseRequest.releaseIntent,
    releaseNotes,
    releaseNotesBaseTag,
    releaseNotesCommits,
    releaseTag,
    sourceVersion: packageJson.version,
  };
}

export function summarizeReleasePlan(plan) {
  return {
    commitCount: plan.commits.length,
    currentVersion: plan.currentVersion,
    existingReleaseTag: plan.existingReleaseTag,
    generatedAt: plan.generatedAt,
    headSha: plan.headSha,
    latestTag: plan.latestTag,
    nextVersion: plan.nextVersion,
    npmDistTag: plan.npmDistTag,
    packageName: plan.packageName,
    prerelease: plan.prerelease,
    releaseBump: plan.releaseBump,
    releaseIntent: plan.releaseIntent,
    releaseNotesBaseTag: plan.releaseNotesBaseTag,
    releaseNotesCommitCount: plan.releaseNotesCommits.length,
    releaseTag: plan.releaseTag,
  };
}

export function assertReleasePlanSummaryMatches(expected, actual) {
  const mismatches = comparableReleasePlanSummaryFields.filter(
    (field) => expected[field] !== actual[field],
  );

  if (mismatches.length === 0) {
    return;
  }

  throw new Error(
    `Release plan changed after validation: ${mismatches
      .map(
        (field) =>
          `${field} expected ${formatPlanValue(expected[field])}, found ${formatPlanValue(actual[field])}`,
      )
      .join('; ')}.`,
  );
}

export function printReleasePlan(plan) {
  const summary = summarizeReleasePlan(plan);

  console.log(`Package: ${summary.packageName}`);
  console.log(`Release intent: ${summary.releaseIntent}`);
  console.log(`Release bump: ${summary.releaseBump}`);
  console.log(`Current version: ${summary.currentVersion}`);
  console.log(`Latest tag: ${summary.latestTag ?? 'none'}`);
  console.log(`Next version: ${summary.nextVersion}`);
  console.log(`npm dist-tag: ${summary.npmDistTag}`);
  console.log(`Release tag: ${summary.releaseTag}`);
  console.log(`Release commits: ${summary.commitCount}`);
  console.log(
    `Release notes base tag: ${summary.releaseNotesBaseTag ?? 'none'}`,
  );
  console.log(`Release note commits: ${summary.releaseNotesCommitCount}`);
}

function resolveReleasePaths(paths = {}, releasePackage) {
  return {
    packageJsonPath: paths.packageJsonPath ?? releasePackage.packageJsonPath,
  };
}

function resolveReleaseRequest({
  commits,
  currentVersion,
  headReleaseTag,
  latestReleaseTag,
  options,
  releaseBaseTag,
  releasePackage,
}) {
  const releaseIntent = normalizeReleaseIntent(
    options.releaseIntent ?? releaseIntents.stable,
  );
  const releaseBump = normalizeReleaseBump(options.bump ?? releaseBumps.auto);

  switch (releaseIntent) {
    case releaseIntents.prerelease:
      return {
        expectedPrerelease: true,
        nextVersion: resolvePrereleaseNextVersion(currentVersion, commits, {
          bump: releaseBump,
        }),
        releaseBump,
        releaseIntent,
      };

    case releaseIntents.promoteStable:
      assertPromotableStableRelease({
        commits,
        headReleaseTag,
        latestReleaseTag,
        releaseBaseTag,
        releasePackage,
      });

      return {
        expectedPrerelease: false,
        nextVersion: removePrerelease(
          resolvePromotedPrereleaseTag({
            headReleaseTag,
            latestReleaseTag,
            releaseBaseTag,
          }).version,
        ),
        releaseBump: releaseBumps.auto,
        releaseIntent,
      };

    case releaseIntents.manual:
      return {
        expectedPrerelease: undefined,
        nextVersion: resolveManualVersion(options),
        releaseBump: 'manual',
        releaseIntent,
      };

    case releaseIntents.stable:
      return {
        expectedPrerelease: false,
        nextVersion: resolveStableNextVersion(currentVersion, commits, {
          allowMajorWithoutPrerelease: options.allowMajorWithoutPrerelease,
          bump: releaseBump,
          latestReleaseTag,
        }),
        releaseBump,
        releaseIntent,
      };

    default:
      throw new Error(`Unknown release intent: ${releaseIntent}`);
  }
}

function assertSupportedReleaseOptions(options) {
  const unsupportedOptions = ['intent', 'prerelease', 'versionSpecifier'].filter(
    (option) => Object.hasOwn(options, option),
  );

  if (unsupportedOptions.length === 0) {
    return;
  }

  throw new Error(
    `Unsupported release option(s): ${unsupportedOptions.join(', ')}. Use releaseIntent with bump, or releaseIntent manual with manualVersion and manualReason.`,
  );
}

function normalizeReleaseIntent(intent) {
  if (Object.values(releaseIntents).includes(intent)) {
    return intent;
  }

  throw new Error(
    `Unknown release intent: ${intent}. Expected one of ${Object.values(releaseIntents).join(', ')}.`,
  );
}

function normalizeReleaseBump(bump) {
  if (Object.values(releaseBumps).includes(bump)) {
    return bump;
  }

  throw new Error(
    `Unknown release bump: ${bump}. Expected one of ${Object.values(releaseBumps).join(', ')}.`,
  );
}

function resolveStableNextVersion(currentVersion, commits, options = {}) {
  const latestReleaseTag = options.latestReleaseTag;

  if (latestReleaseTag && semver.prerelease(latestReleaseTag.version)) {
    throw new Error(
      `Latest release tag ${latestReleaseTag.tag} is a prerelease; use release intent ${releaseIntents.promoteStable} to publish it as stable.`,
    );
  }

  const nextVersion = resolveBumpedStableVersion(currentVersion, commits, {
    bump: options.bump,
  });

  if (
    nextVersion &&
    isMajorStableRelease(currentVersion, nextVersion) &&
    !options.allowMajorWithoutPrerelease
  ) {
    throw new Error(
      `Refusing to publish major stable release ${nextVersion} without a prerelease train. Use release intent ${releaseIntents.prerelease} with bump ${releaseBumps.major}, or pass --allow-major-without-prerelease.`,
    );
  }

  return nextVersion;
}

function resolveBumpedStableVersion(currentVersion, commits, { bump }) {
  if (bump === releaseBumps.auto) {
    const releaseType = inferReleaseTypeFromCommits(commits);

    return releaseType ? semver.inc(currentVersion, releaseType) : null;
  }

  return semver.inc(currentVersion, bump);
}

function resolvePrereleaseNextVersion(currentVersion, commits, { bump }) {
  const releaseType =
    bump === releaseBumps.auto ? inferReleaseTypeFromCommits(commits) : bump;

  return releaseType
    ? inferPrereleaseVersion(currentVersion, releaseType)
    : null;
}

function resolveManualVersion(options) {
  const manualVersion = options.manualVersion?.trim();
  const manualReason = options.manualReason?.trim();

  if (!manualVersion || !semver.valid(manualVersion)) {
    throw new Error(
      `Release intent ${releaseIntents.manual} requires --manual-version with an exact semver version.`,
    );
  }

  if (!manualReason) {
    throw new Error(
      `Release intent ${releaseIntents.manual} requires --manual-reason.`,
    );
  }

  return manualVersion;
}

function assertPromotableStableRelease({
  commits,
  headReleaseTag,
  latestReleaseTag,
  releaseBaseTag,
  releasePackage,
}) {
  const prereleaseTag = resolvePromotedPrereleaseTag({
    headReleaseTag,
    latestReleaseTag,
    releaseBaseTag,
  });

  if (!prereleaseTag) {
    throw new Error(
      `Release intent ${releaseIntents.promoteStable} requires the latest release tag to be a prerelease.`,
    );
  }

  const blockingCommits = getStablePromotionBlockingCommits(
    commits,
    releasePackage,
  );

  if (blockingCommits.length > 0) {
    throw new Error(
      `Refusing to promote ${prereleaseTag.tag} because ${blockingCommits.length} package-impacting commit(s) landed after that prerelease. Publish another prerelease first.`,
    );
  }
}

function getStablePromotionBlockingCommits(commits, releasePackage) {
  return commits.filter((commit) =>
    hasStablePromotionBlockingFiles(commit, releasePackage),
  );
}

function hasStablePromotionBlockingFiles(commit, releasePackage) {
  const releaseFiles = getReleaseFiles(commit, releasePackage);

  if (releaseFiles.length === 0) {
    return true;
  }

  return releaseFiles.some(
    (file) => !matchesStablePromotionIgnoredPath(file, releasePackage),
  );
}

function matchesStablePromotionIgnoredPath(file, releasePackage) {
  const ignoredPaths = releasePackage.stablePromotionIgnoredPaths ?? [];

  return ignoredPaths.some((pattern) => matchesPathPattern(file, pattern));
}

function resolvePromotedPrereleaseTag({
  headReleaseTag,
  latestReleaseTag,
  releaseBaseTag,
}) {
  if (headReleaseTag && !isPrereleaseVersion(headReleaseTag.version)) {
    return isPrereleaseVersion(releaseBaseTag?.version) ? releaseBaseTag : null;
  }

  return isPrereleaseVersion(latestReleaseTag?.version)
    ? latestReleaseTag
    : null;
}

function removePrerelease(version) {
  const parsedVersion = semver.parse(version);

  if (!parsedVersion) {
    throw new Error(`Invalid prerelease version: ${version}`);
  }

  return `${parsedVersion.major}.${parsedVersion.minor}.${parsedVersion.patch}`;
}

function isMajorStableRelease(currentVersion, nextVersion) {
  return (
    currentVersion !== initialReleaseVersion &&
    !semver.prerelease(nextVersion) &&
    semver.major(nextVersion) > semver.major(currentVersion)
  );
}

function isPrereleaseVersion(version) {
  return Boolean(version && semver.prerelease(version));
}

function getHeadSha({ capture }) {
  try {
    return capture('git', ['rev-parse', 'HEAD']).trim() || null;
  } catch {
    return null;
  }
}

function formatPlanValue(value) {
  return value === null || value === undefined ? 'none' : JSON.stringify(value);
}

function getRepositoryUrl(repository) {
  if (typeof repository === 'string') {
    return repository;
  }

  return repository?.url;
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

function resolveReleaseNotesBaseTag({
  headReleaseTag,
  prerelease,
  releaseBaseTag,
  releaseTags,
}) {
  if (prerelease) {
    return releaseBaseTag?.tag ?? null;
  }

  return (
    getLatestStableReleaseTag(releaseTags, {
      excludeTag: headReleaseTag?.tag,
    })?.tag ?? null
  );
}

function getLatestStableReleaseTag(releaseTags, { excludeTag } = {}) {
  return releaseTags.find(
    (tag) => tag.tag !== excludeTag && !semver.prerelease(tag.version),
  );
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
      const changedJsonFields = new Map();

      return {
        author,
        body,
        files: getCommitFiles(hash, { capture }),
        getChangedJsonFields(file) {
          const normalizedFile = normalizeRepoPath(file);

          if (!changedJsonFields.has(normalizedFile)) {
            changedJsonFields.set(
              normalizedFile,
              getChangedJsonFields(hash, normalizedFile, { capture }),
            );
          }

          return changedJsonFields.get(normalizedFile);
        },
        hash,
        subject,
      };
    });
}

function getCommitFiles(hash, { capture }) {
  const output = capture('git', [
    'diff-tree',
    '--no-commit-id',
    '--name-only',
    '-r',
    '--root',
    hash,
  ]).trim();

  if (!output) {
    return [];
  }

  return output
    .split('\n')
    .map((file) => normalizeRepoPath(file))
    .filter(Boolean);
}

function filterReleaseCommits(commits, releasePackage) {
  return commits.filter((commit) => isReleaseCommit(commit, releasePackage));
}

function isReleaseCommit(commit, releasePackage) {
  const releaseFiles = getReleaseFiles(commit, releasePackage);
  const touchesPackagePath = releaseFiles.length > 0;

  if (hasIgnoredReleaseScope(commit, releasePackage)) {
    return releaseFiles.some(
      (file) => !matchesIgnoredReleaseScopeFile(commit, file, releasePackage),
    );
  }

  return hasReleaseScope(commit, releasePackage) || touchesPackagePath;
}

function hasReleaseScope(commit, releasePackage) {
  const scope = getCommitScope(commit);
  const releaseScopes = releasePackage.releaseScopes ?? [];

  if (!scope || releaseScopes.length === 0) {
    return false;
  }

  return releaseScopes.some(
    (releaseScope) => releaseScope.toLowerCase() === scope.toLowerCase(),
  );
}

function hasIgnoredReleaseScope(commit, releasePackage) {
  const scope = getCommitScope(commit);
  const ignoredScopes = releasePackage.ignoredReleaseScopes ?? [];

  if (!scope || ignoredScopes.length === 0) {
    return false;
  }

  return ignoredScopes.some(
    (ignoredScope) => ignoredScope.toLowerCase() === scope.toLowerCase(),
  );
}

function getReleaseFiles(commit, releasePackage) {
  const releasePaths = releasePackage.releasePaths ?? [];

  return commit.files.filter((file) =>
    releasePaths.some((pattern) => matchesPathPattern(file, pattern)),
  );
}

function matchesIgnoredReleaseScopeFile(commit, file, releasePackage) {
  return (
    matchesIgnoredReleaseScopePath(file, releasePackage) ||
    matchesIgnoredReleaseScopeJsonFieldChange(commit, file, releasePackage)
  );
}

function matchesIgnoredReleaseScopePath(file, releasePackage) {
  const ignoredPaths = releasePackage.ignoredReleaseScopePaths ?? [];

  return ignoredPaths.some((pattern) => matchesPathPattern(file, pattern));
}

function matchesIgnoredReleaseScopeJsonFieldChange(
  commit,
  file,
  releasePackage,
) {
  const ignoredFields = getIgnoredReleaseScopeJsonFields(file, releasePackage);

  if (ignoredFields.size === 0 || !commit.getChangedJsonFields) {
    return false;
  }

  const changedFields = commit.getChangedJsonFields(file);

  if (!changedFields) {
    return false;
  }

  return changedFields.every((field) => ignoredFields.has(field));
}

function getIgnoredReleaseScopeJsonFields(file, releasePackage) {
  const ignoredJsonFields = releasePackage.ignoredReleaseScopeJsonFields ?? {};
  const fields = Object.entries(ignoredJsonFields).flatMap(
    ([pattern, ignoredFields]) =>
      matchesPathPattern(file, pattern) ? ignoredFields : [],
  );

  return new Set(fields);
}

function getChangedJsonFields(hash, file, { capture }) {
  const before = readJsonAtCommit(`${hash}^`, file, { capture });
  const after = readJsonAtCommit(hash, file, { capture });

  if (
    before === invalidJsonFile ||
    after === invalidJsonFile ||
    (before === missingJsonFile && after === missingJsonFile)
  ) {
    return null;
  }

  const beforeJson = before === missingJsonFile ? {} : before;
  const afterJson = after === missingJsonFile ? {} : after;

  return [...new Set([...Object.keys(beforeJson), ...Object.keys(afterJson)])]
    .filter((field) => !isDeepStrictEqual(beforeJson[field], afterJson[field]))
    .sort();
}

function readJsonAtCommit(revision, file, { capture }) {
  try {
    return JSON.parse(capture('git', ['show', `${revision}:${file}`]));
  } catch (error) {
    if (error instanceof SyntaxError) {
      return invalidJsonFile;
    }

    return missingJsonFile;
  }
}

function matchesPathPattern(file, pattern) {
  const normalizedFile = normalizeRepoPath(file);
  const normalizedPattern = normalizeRepoPath(pattern);

  if (normalizedPattern.endsWith('/**')) {
    const directory = normalizedPattern.slice(0, -3);

    return (
      normalizedFile === directory || normalizedFile.startsWith(`${directory}/`)
    );
  }

  if (normalizedPattern.includes('*')) {
    return globPatternToRegExp(normalizedPattern).test(normalizedFile);
  }

  return (
    normalizedFile === normalizedPattern ||
    normalizedFile.startsWith(`${normalizedPattern}/`)
  );
}

function globPatternToRegExp(pattern) {
  const source = pattern
    .split('/')
    .map((segment) => {
      if (segment === '**') {
        return '.*';
      }

      return escapeRegExp(segment).replaceAll('\\*', '[^/]*');
    })
    .join('/');

  return new RegExp(`^${source}$`);
}

function normalizeRepoPath(path) {
  return path.replaceAll('\\', '/').replace(/^\.\//, '').trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    formatBreakingCommitGroup(
      '### ⚠️ Breaking Changes',
      groupedCommits.breaking,
    ),
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
    ...commits.map((commit) => formatCommitBullet(commit)),
  ].join('\n');
}

function formatBreakingCommitGroup(title, commits) {
  if (commits.length === 0) {
    return null;
  }

  return [
    title,
    '',
    ...commits.flatMap((commit) => [
      formatCommitBullet(commit),
      ...getBreakingChangeDescriptions(commit.body).map(
        (description) => `  - ${description}`,
      ),
    ]),
  ].join('\n');
}

function formatCommitBullet(commit) {
  return `- ${formatCommitSubject(commit.subject)} ([${commit.hash.slice(0, 7)}](${repoUrl}/commit/${commit.hash}))`;
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
  return subject.replace(/^[a-zA-Z][\w-]*(?:\([^)]+\))?!?:\s*/, '');
}

function getCommitType(commit) {
  return parseConventionalCommit(commit.subject)?.type ?? null;
}

function getCommitScope(commit) {
  return parseConventionalCommit(commit.subject)?.scope ?? null;
}

function parseConventionalCommit(subject) {
  const match = subject.match(/^([a-zA-Z][\w-]*)(?:\(([^)]+)\))?!?:/);

  if (!match) {
    return null;
  }

  return {
    scope: match[2] ?? null,
    type: match[1],
  };
}

function getBreakingChangeDescriptions(body) {
  const descriptions = [];
  const lines = (body ?? '').replace(/\r\n?/g, '\n').split('\n');
  let currentDescription = null;

  for (const line of lines) {
    const breakingChangeMatch = line.match(/^BREAKING(?: |-)CHANGE:\s*(.*)$/i);

    if (breakingChangeMatch) {
      pushBreakingChangeDescription(descriptions, currentDescription);
      currentDescription = [breakingChangeMatch[1]];
      continue;
    }

    if (!currentDescription) {
      continue;
    }

    if (line.trim() === '') {
      pushBreakingChangeDescription(descriptions, currentDescription);
      currentDescription = null;
      continue;
    }

    if (isConventionalFooterLine(line)) {
      pushBreakingChangeDescription(descriptions, currentDescription);
      currentDescription = null;
      continue;
    }

    currentDescription.push(line);
  }

  pushBreakingChangeDescription(descriptions, currentDescription);

  return descriptions;
}

function pushBreakingChangeDescription(descriptions, lines) {
  const description = lines
    ?.join('\n')
    .trim()
    .replace(/[ \t]*\n[ \t]*/g, ' ')
    .replace(/[ \t]+/g, ' ');

  if (description) {
    descriptions.push(description);
  }
}

function isConventionalFooterLine(line) {
  return /^[A-Za-z][A-Za-z0-9-]*(?: [A-Za-z][A-Za-z0-9-]*)?:\s+/.test(
    line.trim(),
  );
}

function isBreakingCommit(commit) {
  return (
    /^[a-zA-Z][\w-]*(?:\([^)]+\))!:/.test(commit.subject) ||
    getBreakingChangeDescriptions(commit.body).length > 0
  );
}

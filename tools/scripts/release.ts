import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import semver, { type ReleaseType } from 'semver';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const packageRoot = 'packages/sanity';
const packageJsonPath = resolve(packageRoot, 'package.json');
const changelogPath = resolve(packageRoot, 'CHANGELOG.md');
const releaseTagPrefix = 'sanity@';
const repoUrl = 'https://github.com/limitless-angular/limitless-angular';

type Commit = {
  hash: string;
  subject: string;
  body: string;
  author: string;
};

type ReleaseGroup = 'breaking' | 'features' | 'fixes' | 'refactors';

(async () => {
  try {
    const options = await yargs(hideBin(process.argv))
      .version(false)
      .option('version', {
        description:
          'Explicit version specifier to use, if overriding conventional commits',
        type: 'string',
      })
      .option('dryRun', {
        alias: 'd',
        description:
          'Whether or not to perform a dry-run of the release process, defaults to true',
        type: 'boolean',
        default: true,
      })
      .option('verbose', {
        description:
          'Whether or not to enable verbose logging, defaults to false',
        type: 'boolean',
        default: false,
      })
      .parseAsync();

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const currentVersion = packageJson.version;
    const latestTag = getLatestTag(currentVersion);
    const commits = getCommitsSince(latestTag);
    const nextVersion = options.version
      ? resolveVersionSpecifier(currentVersion, options.version)
      : inferVersionFromCommits(currentVersion, commits);

    if (!nextVersion) {
      throw new Error(
        'No release version could be determined. Pass --version or add a conventional commit with feat, fix, perf, refactor, or a breaking change.',
      );
    }

    if (nextVersion === currentVersion) {
      throw new Error(
        `Refusing to release unchanged version ${currentVersion}.`,
      );
    }

    const releaseTag = `${releaseTagPrefix}${nextVersion}`;
    const changelogSection = buildChangelogSection(nextVersion, commits);

    if (options.verbose || options.dryRun) {
      console.log(`Current version: ${currentVersion}`);
      console.log(`Latest tag: ${latestTag ?? 'none'}`);
      console.log(`Next version: ${nextVersion}`);
      console.log(`Release tag: ${releaseTag}`);
    }

    if (!options.dryRun) {
      packageJson.version = nextVersion;
      writeFileSync(
        packageJsonPath,
        `${JSON.stringify(packageJson, null, 2)}\n`,
      );
      writeFileSync(
        changelogPath,
        `${changelogSection}\n${readFileSync(changelogPath, 'utf8').trimStart()}`,
      );

      run('git', ['add', packageJsonPath, changelogPath]);
      run('git', [
        'commit',
        '-m',
        `chore(release): publish ${nextVersion} [skip ci]`,
      ]);
      run('git', ['tag', releaseTag]);
      run('git', ['push', 'origin', 'HEAD', '--follow-tags']);
      createGitHubRelease(releaseTag, changelogSection);
    }

    console.log(`RELEASED_VERSION=${nextVersion}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

function resolveVersionSpecifier(
  currentVersion: string,
  specifier: string,
): string | null {
  const trimmedSpecifier = specifier.trim();

  if (semver.valid(trimmedSpecifier)) {
    return trimmedSpecifier;
  }

  return semver.inc(currentVersion, trimmedSpecifier as ReleaseType);
}

function inferVersionFromCommits(
  currentVersion: string,
  commits: Commit[],
): string | null {
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

function getLatestTag(currentVersion: string): string | null {
  const currentTag = `${releaseTagPrefix}${currentVersion}`;

  if (commandSucceeds('git', ['rev-parse', '--verify', currentTag])) {
    return currentTag;
  }

  try {
    return run('git', [
      'describe',
      '--tags',
      '--abbrev=0',
      `--match=${releaseTagPrefix}*`,
    ]).trim();
  } catch {
    return null;
  }
}

function getCommitsSince(tag: string | null): Commit[] {
  const range = tag ? `${tag}..HEAD` : 'HEAD';
  const output = run('git', [
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

      return { hash, subject, body, author };
    });
}

function buildChangelogSection(version: string, commits: Commit[]): string {
  const groupedCommits = commits.reduce<Record<ReleaseGroup, Commit[]>>(
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

  return [
    `## ${version} (${new Date().toISOString().slice(0, 10)})`,
    ...sections,
  ]
    .join('\n\n')
    .concat('\n');
}

function formatCommitGroup(title: string, commits: Commit[]): string | null {
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

function formatAuthors(commits: Commit[]): string | null {
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

function formatCommitSubject(subject: string): string {
  return subject.replace(/^\w+(?:\([^)]+\))?!?:\s*/, '');
}

function getCommitType(commit: Commit): string | null {
  return commit.subject.match(/^(\w+)(?:\([^)]+\))?!?:/)?.[1] ?? null;
}

function isBreakingCommit(commit: Commit): boolean {
  return (
    /^\w+(?:\([^)]+\))!:/.test(commit.subject) ||
    /BREAKING CHANGE:/i.test(commit.body)
  );
}

function createGitHubRelease(tag: string, notes: string): void {
  if (!process.env['GITHUB_TOKEN']) {
    return;
  }

  const tempDir = mkdtempSync(join(tmpdir(), 'limitless-release-'));
  const notesPath = join(tempDir, 'notes.md');

  try {
    writeFileSync(notesPath, notes);
    run('gh', [
      'release',
      'create',
      tag,
      '--title',
      tag,
      '--notes-file',
      notesPath,
    ]);
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

function commandSucceeds(command: string, args: string[]): boolean {
  try {
    run(command, args);
    return true;
  } catch {
    return false;
  }
}

function run(command: string, args: string[]): string {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
}

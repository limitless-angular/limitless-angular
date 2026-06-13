import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { run as defaultRun } from './commands.mjs';
import { sanityPackageRelativePaths } from './config.mjs';

export function commitRelease(plan, options = {}) {
  const commandRun = options.run ?? defaultRun;

  commandRun('git', [
    'add',
    sanityPackageRelativePaths.packageJson,
    sanityPackageRelativePaths.changelog,
  ]);
  commandRun('git', [
    'commit',
    '-m',
    `chore(release): publish ${plan.nextVersion} [skip ci]`,
  ]);
  commandRun('git', ['tag', plan.releaseTag]);
}

export function publishTarball(tarballPath, options = {}) {
  const commandRun = options.run ?? defaultRun;
  const args = [
    'publish',
    tarballPath,
    '--access',
    'public',
    '--registry',
    'https://registry.npmjs.org',
  ];

  if (options.npmDistTag && options.npmDistTag !== 'latest') {
    args.push('--tag', options.npmDistTag);
  }

  commandRun('npm', args);
}

export function pushRelease(options = {}) {
  const commandRun = options.run ?? defaultRun;

  commandRun('git', ['push', 'origin', 'HEAD', '--follow-tags']);
}

export function createGitHubRelease(plan, options = {}) {
  const commandRun = options.run ?? defaultRun;
  const env = { ...process.env, ...options.env };

  if (!env.GITHUB_TOKEN) {
    throw new Error('Missing GITHUB_TOKEN; cannot create the GitHub release.');
  }

  const tempDir = mkdtempSync(join(tmpdir(), 'limitless-release-'));
  const notesPath = join(tempDir, 'notes.md');

  try {
    writeFileSync(notesPath, plan.changelogSection);
    const args = [
      'release',
      'create',
      plan.releaseTag,
      '--title',
      plan.releaseTag,
      '--notes-file',
      notesPath,
    ];

    if (plan.prerelease) {
      args.push('--prerelease');
    }

    commandRun('gh', args, { env });
    return true;
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

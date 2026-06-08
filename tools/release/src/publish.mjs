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

  commandRun('npm', [
    'publish',
    tarballPath,
    '--access',
    'public',
    '--registry',
    'https://registry.npmjs.org',
  ]);
}

export function pushRelease(options = {}) {
  const commandRun = options.run ?? defaultRun;

  commandRun('git', ['push', 'origin', 'HEAD', '--follow-tags']);
}

export function createGitHubRelease(plan, options = {}) {
  const commandRun = options.run ?? defaultRun;
  const env = { ...process.env, ...options.env };

  if (!env.GITHUB_TOKEN) {
    return false;
  }

  const tempDir = mkdtempSync(join(tmpdir(), 'limitless-release-'));
  const notesPath = join(tempDir, 'notes.md');

  try {
    writeFileSync(notesPath, plan.changelogSection);
    commandRun(
      'gh',
      [
        'release',
        'create',
        plan.releaseTag,
        '--title',
        plan.releaseTag,
        '--notes-file',
        notesPath,
      ],
      { env },
    );
    return true;
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}

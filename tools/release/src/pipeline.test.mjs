import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  compatibilityValidationSteps,
  releaseModes,
  runReleasePipeline,
} from './pipeline.mjs';

const trustedPublishingEnv = {
  ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'github-oidc-token',
  ACTIONS_ID_TOKEN_REQUEST_URL: 'https://actions.example/id-token',
  GITHUB_REF: 'refs/heads/main',
  GITHUB_TOKEN: 'token',
};

test('dry-run validates the planned artifact version and restores release files', () => {
  const fixture = createReleaseFixture();
  const commands = [];
  let packageVersionDuringArtifactCheck;

  try {
    const result = runReleasePipeline({
      artifact: {
        readTarballPackageJson() {
          packageVersionDuringArtifactCheck = readPackageVersion(
            fixture.paths.packageJsonPath,
          );
          return {
            name: '@limitless-angular/sanity',
            version: packageVersionDuringArtifactCheck,
          };
        },
        tarballPath: '/tmp/release.tgz',
      },
      capture: createCapture(),
      mode: releaseModes.dryRun,
      now: new Date('2026-06-08T00:00:00.000Z'),
      paths: fixture.paths,
      run: recordCommand(commands),
      versionSpecifier: 'minor',
    });

    assert.equal(result.published, false);
    assert.equal(result.plan.nextVersion, '1.1.0');
    assert.equal(packageVersionDuringArtifactCheck, '1.1.0');
    assert.equal(readPackageVersion(fixture.paths.packageJsonPath), '1.0.0');
    assert.equal(
      readFileSync(fixture.paths.changelogPath, 'utf8'),
      '## 1.0.0\n',
    );
    assert.deepEqual(
      commands.map(({ command, args }) => [command, args]),
      compatibilityValidationSteps.map(({ command, args }) => [command, args]),
    );
  } finally {
    fixture.cleanup();
  }
});

test('publish mode validates before starting release side effects', () => {
  const fixture = createReleaseFixture();
  const commands = [];

  try {
    const result = runReleasePipeline({
      artifact: {
        readTarballPackageJson() {
          return { name: '@limitless-angular/sanity', version: '1.0.1' };
        },
        tarballPath: '/tmp/release.tgz',
      },
      capture: createCapture(),
      env: trustedPublishingEnv,
      mode: releaseModes.publish,
      now: new Date('2026-06-08T00:00:00.000Z'),
      paths: fixture.paths,
      run: recordCommand(commands),
      versionSpecifier: 'patch',
    });

    assert.equal(result.published, true);
    assert.equal(readPackageVersion(fixture.paths.packageJsonPath), '1.0.1');

    const commandIds = commands.map(({ command, args }) =>
      [command, ...args].join(' '),
    );
    const compatibilityCommandCount = compatibilityValidationSteps.length;
    const compatibilityStart = commandIds.findIndex(
      (command) =>
        command ===
        'pnpm turbo run compat:pack --filter=@limitless-angular/angular-compat',
    );
    assert.notEqual(compatibilityStart, -1);

    assert.deepEqual(
      commands
        .slice(
          compatibilityStart,
          compatibilityStart + compatibilityCommandCount,
        )
        .map(({ command, args }) => [command, args]),
      compatibilityValidationSteps.map(({ command, args }) => [command, args]),
    );
    assert.ok(
      commandIds.findIndex((command) => command.startsWith('git add ')) >
        compatibilityStart + compatibilityCommandCount - 1,
    );
    assert.ok(
      commandIds.findIndex((command) => command.startsWith('npm publish ')) >
        commandIds.findIndex((command) => command.startsWith('git commit ')),
    );
    assert.ok(
      commandIds.findIndex((command) =>
        command.startsWith('git push origin HEAD --follow-tags'),
      ) > commandIds.findIndex((command) => command.startsWith('npm publish ')),
    );
  } finally {
    fixture.cleanup();
  }
});

test('publish mode tags npm and GitHub prereleases', () => {
  const fixture = createReleaseFixture();
  const commands = [];

  try {
    const result = runReleasePipeline({
      artifact: {
        readTarballPackageJson() {
          return {
            name: '@limitless-angular/sanity',
            version: '1.1.0-next.0',
          };
        },
        tarballPath: '/tmp/release.tgz',
      },
      capture: createCapture({
        gitLog:
          'abc1234\x01feat(sanity): add release validation\x01\x01Alfonso\x02',
      }),
      env: trustedPublishingEnv,
      mode: releaseModes.publish,
      now: new Date('2026-06-08T00:00:00.000Z'),
      paths: fixture.paths,
      prerelease: true,
      run: recordCommand(commands),
    });

    assert.equal(result.published, true);
    assert.equal(result.plan.nextVersion, '1.1.0-next.0');
    assert.equal(result.plan.npmDistTag, 'next');

    const npmPublish = commands.find(
      ({ command, args }) => command === 'npm' && args[0] === 'publish',
    );
    assert.deepEqual(npmPublish?.args, [
      'publish',
      '/tmp/release.tgz',
      '--access',
      'public',
      '--registry',
      'https://registry.npmjs.org',
      '--tag',
      'next',
    ]);

    const githubRelease = commands.find(
      ({ command, args }) =>
        command === 'gh' && args[0] === 'release' && args[1] === 'create',
    );
    assert.ok(githubRelease?.args.includes('--prerelease'));
  } finally {
    fixture.cleanup();
  }
});

test('artifact version mismatch fails before publish side effects', () => {
  const fixture = createReleaseFixture();
  const commands = [];

  try {
    assert.throws(
      () =>
        runReleasePipeline({
          artifact: {
            readTarballPackageJson() {
              return { name: '@limitless-angular/sanity', version: '1.0.0' };
            },
            tarballPath: '/tmp/release.tgz',
          },
          capture: createCapture(),
          env: trustedPublishingEnv,
          mode: releaseModes.publish,
          now: new Date('2026-06-08T00:00:00.000Z'),
          paths: fixture.paths,
          run: recordCommand(commands),
          versionSpecifier: 'patch',
        }),
      /does not match planned release version 1\.0\.1/,
    );

    assert.equal(readPackageVersion(fixture.paths.packageJsonPath), '1.0.0');
    assert.equal(
      commands.some(
        ({ command, args }) =>
          (command === 'git' && args[0] === 'add') ||
          (command === 'npm' && args[0] === 'publish'),
      ),
      false,
    );
  } finally {
    fixture.cleanup();
  }
});

function createReleaseFixture() {
  const directory = mkdtempSync(join(tmpdir(), 'limitless-release-pipeline-'));
  const packageJsonPath = join(directory, 'package.json');
  const changelogPath = join(directory, 'CHANGELOG.md');

  writeFileSync(
    packageJsonPath,
    `${JSON.stringify(
      {
        name: '@limitless-angular/sanity',
        repository: {
          type: 'git',
          url: 'https://github.com/limitless-angular/limitless-angular',
        },
        version: '1.0.0',
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(changelogPath, '## 1.0.0\n');

  return {
    cleanup() {
      rmSync(directory, { force: true, recursive: true });
    },
    paths: { changelogPath, packageJsonPath },
  };
}

function createCapture({ gitLog = '', npmVersions = ['1.0.0'] } = {}) {
  return (command, args) => {
    if (command === 'git' && args[0] === 'status') {
      return '';
    }

    if (command === 'git' && args[0] === 'branch') {
      return 'main';
    }

    if (
      command === 'git' &&
      args[0] === 'rev-parse' &&
      args[1] === '--verify' &&
      args[2]?.startsWith('refs/tags/')
    ) {
      throw new Error(`Missing tag ${args[2]}`);
    }

    if (command === 'git' && args[0] === 'rev-parse') {
      if (args[1] === 'HEAD' || args[1] === 'origin/main') {
        return 'main-sha';
      }

      return '';
    }

    if (command === 'git' && args[0] === 'merge-base') {
      return 'main-sha';
    }

    if (command === 'git' && args[0] === 'log') {
      return gitLog;
    }

    if (command === 'git' && args[0] === 'ls-remote') {
      throw new Error(`Missing remote tag ${args.at(-1)}`);
    }

    if (command === 'npm' && args[0] === 'view') {
      return JSON.stringify(npmVersions);
    }

    throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
  };
}

function recordCommand(commands) {
  return (command, args, options = {}) => {
    commands.push({ args, command, options });
  };
}

function readPackageVersion(packageJsonPath) {
  return JSON.parse(readFileSync(packageJsonPath, 'utf8')).version;
}

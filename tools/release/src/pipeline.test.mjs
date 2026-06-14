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
const sourceVersion = '0.0.0-development';

test('dry-run validates the planned artifact version without mutating release files', () => {
  const fixture = createReleaseFixture();
  const harness = createReleaseHarness({ nextVersion: '1.1.0' });

  try {
    const result = runReleasePipeline({
      artifact: {
        readTarballPackageJson() {
          return {
            name: '@limitless-angular/sanity',
            version: '1.1.0',
          };
        },
        tarballPath: '/tmp/release.tgz',
      },
      capture: harness.capture,
      mode: releaseModes.dryRun,
      now: new Date('2026-06-08T00:00:00.000Z'),
      paths: fixture.paths,
      run: harness.run,
      versionSpecifier: 'minor',
    });

    assert.equal(result.published, false);
    assert.equal(result.plan.nextVersion, '1.1.0');
    assert.equal(
      readPackageVersion(fixture.paths.packageJsonPath),
      sourceVersion,
    );
    assert.deepEqual(
      harness.commands.map(({ command, args }) => [command, args]),
      compatibilityValidationSteps.map(({ command, args }) => [command, args]),
    );
    assertVersionedCompatibilityEnv(harness.commands, '1.1.0');
  } finally {
    fixture.cleanup();
  }
});

test('publish mode pushes the release tag before publishing to npm', () => {
  const fixture = createReleaseFixture();
  const harness = createReleaseHarness({ nextVersion: '1.0.1' });

  try {
    const result = runReleasePipeline({
      artifact: {
        readTarballPackageJson() {
          return { name: '@limitless-angular/sanity', version: '1.0.1' };
        },
        tarballPath: '/tmp/release.tgz',
      },
      capture: harness.capture,
      env: trustedPublishingEnv,
      mode: releaseModes.publish,
      now: new Date('2026-06-08T00:00:00.000Z'),
      paths: fixture.paths,
      run: harness.run,
      versionSpecifier: 'patch',
    });

    assert.equal(result.published, true);
    assert.equal(
      readPackageVersion(fixture.paths.packageJsonPath),
      sourceVersion,
    );

    const commandIds = toCommandIds(harness.commands);
    assert.equal(
      commandIds.some((command) => command.startsWith('git add ')),
      false,
    );
    assert.equal(
      commandIds.some((command) => command.startsWith('git commit ')),
      false,
    );
    assertOrder(commandIds, [
      'pnpm turbo run compat:test --filter=@limitless-angular/angular-compat',
      'git tag -a sanity@1.0.1 -m sanity@1.0.1 HEAD',
      'git push origin refs/tags/sanity@1.0.1',
      'npm publish /tmp/release.tgz --access public --registry https://registry.npmjs.org',
      'gh release create sanity@1.0.1 --title sanity@1.0.1 --notes-file',
    ]);
    assertVersionedCompatibilityEnv(harness.commands, '1.0.1');
  } finally {
    fixture.cleanup();
  }
});

test('publish mode tags npm and GitHub prereleases', () => {
  const fixture = createReleaseFixture();
  const harness = createReleaseHarness({
    gitLog:
      'abc1234\x01feat(sanity): add release validation\x01\x01Alfonso\x02',
    nextVersion: '1.1.0-next.0',
  });

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
      capture: harness.capture,
      env: trustedPublishingEnv,
      mode: releaseModes.publish,
      now: new Date('2026-06-08T00:00:00.000Z'),
      paths: fixture.paths,
      prerelease: true,
      run: harness.run,
    });

    assert.equal(result.published, true);
    assert.equal(result.plan.nextVersion, '1.1.0-next.0');
    assert.equal(result.plan.npmDistTag, 'next');

    const npmPublish = harness.commands.find(
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

    const githubRelease = harness.commands.find(
      ({ command, args }) =>
        command === 'gh' && args[0] === 'release' && args[1] === 'create',
    );
    assert.ok(githubRelease?.args.includes('--prerelease'));
  } finally {
    fixture.cleanup();
  }
});

test('publish mode resumes when tag, npm version, and GitHub release already exist', () => {
  const fixture = createReleaseFixture();
  const harness = createReleaseHarness({
    githubRelease: {
      isDraft: false,
      isPrerelease: false,
      tagName: 'sanity@1.0.1',
      url: 'https://github.com/example/release',
    },
    headReleaseTags: ['sanity@1.0.1'],
    nextVersion: '1.0.1',
    npmDistTags: { latest: '1.0.1' },
    npmVersions: ['1.0.0', '1.0.1'],
    releaseTags: ['sanity@1.0.1', 'sanity@1.0.0'],
    remoteTagTarget: 'main-sha',
    localTagTarget: 'main-sha',
  });

  try {
    const result = runReleasePipeline({
      artifact: {
        readTarballPackageJson() {
          return { name: '@limitless-angular/sanity', version: '1.0.1' };
        },
        tarballPath: '/tmp/release.tgz',
      },
      capture: harness.capture,
      env: trustedPublishingEnv,
      mode: releaseModes.publish,
      now: new Date('2026-06-08T00:00:00.000Z'),
      paths: fixture.paths,
      run: harness.run,
      versionSpecifier: 'patch',
    });

    assert.equal(result.published, true);
    assert.equal(result.plan.existingReleaseTag, true);

    const commandIds = toCommandIds(harness.commands);
    assert.equal(
      commandIds.some((command) =>
        command.startsWith('git push origin refs/tags/'),
      ),
      false,
    );
    assert.equal(
      commandIds.some((command) => command.startsWith('npm publish ')),
      false,
    );
    assert.equal(
      commandIds.some((command) => command.startsWith('gh release create ')),
      false,
    );
  } finally {
    fixture.cleanup();
  }
});

test('artifact version mismatch fails before publish side effects', () => {
  const fixture = createReleaseFixture();
  const harness = createReleaseHarness({ nextVersion: '1.0.1' });

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
          capture: harness.capture,
          env: trustedPublishingEnv,
          mode: releaseModes.publish,
          now: new Date('2026-06-08T00:00:00.000Z'),
          paths: fixture.paths,
          run: harness.run,
          versionSpecifier: 'patch',
        }),
      /does not match planned release version 1\.0\.1/,
    );

    assert.equal(
      readPackageVersion(fixture.paths.packageJsonPath),
      sourceVersion,
    );
    assert.equal(
      harness.commands.some(
        ({ command, args }) =>
          (command === 'git' && args[0] === 'tag') ||
          (command === 'git' && args[0] === 'push') ||
          (command === 'npm' && args[0] === 'publish') ||
          (command === 'gh' && args[0] === 'release' && args[1] === 'create'),
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

  writeFileSync(
    packageJsonPath,
    `${JSON.stringify(
      {
        name: '@limitless-angular/sanity',
        repository: {
          type: 'git',
          url: 'https://github.com/limitless-angular/limitless-angular',
        },
        version: sourceVersion,
      },
      null,
      2,
    )}\n`,
  );

  return {
    cleanup() {
      rmSync(directory, { force: true, recursive: true });
    },
    paths: { packageJsonPath },
  };
}

function createReleaseHarness({
  gitLog = '',
  githubRelease = null,
  headReleaseTags = [],
  localTagTarget = null,
  nextVersion,
  npmDistTags = { latest: '1.0.0' },
  npmVersions = ['1.0.0'],
  releaseTags = ['sanity@1.0.0'],
  remoteTagTarget = null,
} = {}) {
  const commands = [];
  const state = {
    githubRelease,
    localTagTarget,
    npmDistTags: { ...npmDistTags },
    npmVersions: [...npmVersions],
    releaseTag: nextVersion ? `sanity@${nextVersion}` : null,
    remoteTagTarget,
  };

  return {
    commands,
    capture(command, args) {
      if (command === 'git' && args[0] === 'status') {
        return '';
      }

      if (command === 'git' && args[0] === 'branch') {
        return 'main';
      }

      if (command === 'git' && args[0] === 'tag' && args[1] === '--merged') {
        return releaseTags.join('\n');
      }

      if (command === 'git' && args[0] === 'tag' && args[1] === '--points-at') {
        return headReleaseTags.join('\n');
      }

      if (command === 'git' && args[0] === 'rev-parse') {
        return captureGitRevParse(args, state);
      }

      if (command === 'git' && args[0] === 'merge-base') {
        return 'main-sha';
      }

      if (command === 'git' && args[0] === 'log') {
        return gitLog;
      }

      if (command === 'git' && args[0] === 'ls-remote') {
        return captureGitLsRemote(args, state);
      }

      if (command === 'npm' && args[0] === 'view' && args[2] === 'versions') {
        return JSON.stringify(state.npmVersions);
      }

      if (command === 'npm' && args[0] === 'view' && args[2] === 'dist-tags') {
        return JSON.stringify(state.npmDistTags);
      }

      if (command === 'gh' && args[0] === 'release' && args[1] === 'view') {
        if (!state.githubRelease) {
          throw new Error(`Missing GitHub release ${args[2]}`);
        }

        return JSON.stringify(state.githubRelease);
      }

      throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
    },
    run(command, args, options = {}) {
      commands.push({ args, command, options });

      if (command === 'git' && args[0] === 'tag') {
        state.localTagTarget = 'main-sha';
      }

      if (command === 'git' && args[0] === 'push') {
        state.remoteTagTarget = state.localTagTarget ?? 'main-sha';
      }

      if (command === 'npm' && args[0] === 'publish') {
        if (!state.npmVersions.includes(nextVersion)) {
          state.npmVersions.push(nextVersion);
        }

        state.npmDistTags[getNpmPublishDistTag(args)] = nextVersion;
      }

      if (command === 'gh' && args[0] === 'release' && args[1] === 'create') {
        state.githubRelease = {
          isDraft: false,
          isPrerelease: args.includes('--prerelease'),
          tagName: args[2],
          url: 'https://github.com/example/release',
        };
      }
    },
  };
}

function captureGitRevParse(args, state) {
  if (args[1] === 'HEAD' || args[1] === 'origin/main') {
    return 'main-sha';
  }

  if (args[1] === `${state.releaseTag}^{}` && state.localTagTarget) {
    return state.localTagTarget;
  }

  throw new Error(`Unexpected git rev-parse ${args.join(' ')}`);
}

function captureGitLsRemote(args, state) {
  const ref = args.at(-1);

  if (
    (ref === `refs/tags/${state.releaseTag}^{}` ||
      ref === `refs/tags/${state.releaseTag}`) &&
    state.remoteTagTarget
  ) {
    return `${state.remoteTagTarget}\t${ref}`;
  }

  throw new Error(`Missing remote tag ${ref}`);
}

function getNpmPublishDistTag(args) {
  const tagIndex = args.indexOf('--tag');

  return tagIndex === -1 ? 'latest' : args[tagIndex + 1];
}

function assertVersionedCompatibilityEnv(commands, expectedVersion) {
  const versionedCompatibilityCommands = new Set([
    'pnpm turbo run compat:pack --filter=@limitless-angular/angular-compat',
    'pnpm turbo run compat:artifact --filter=@limitless-angular/angular-compat',
    'pnpm turbo run compat:test --filter=@limitless-angular/angular-compat',
  ]);

  for (const command of commands) {
    const commandId = [command.command, ...command.args].join(' ');

    if (versionedCompatibilityCommands.has(commandId)) {
      assert.equal(
        command.options.env?.LIMITLESS_RELEASE_VERSION,
        expectedVersion,
      );
    }
  }
}

function assertOrder(commandIds, expectedOrder) {
  let previousIndex = -1;

  for (const expectedCommand of expectedOrder) {
    const index = commandIds.findIndex((command) =>
      command.startsWith(expectedCommand),
    );

    assert.notEqual(index, -1, `Missing command: ${expectedCommand}`);
    assert.ok(
      index > previousIndex,
      `Expected ${expectedCommand} to run after ${commandIds[previousIndex]}`,
    );
    previousIndex = index;
  }
}

function toCommandIds(commands) {
  return commands.map(({ command, args }) => [command, ...args].join(' '));
}

function readPackageVersion(packageJsonPath) {
  return JSON.parse(readFileSync(packageJsonPath, 'utf8')).version;
}

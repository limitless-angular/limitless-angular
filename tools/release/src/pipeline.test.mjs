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

    assert.deepEqual(
      commands
        .slice(0, compatibilityCommandCount)
        .map(({ command, args }) => [command, args]),
      compatibilityValidationSteps.map(({ command, args }) => [command, args]),
    );
    assert.ok(
      commandIds.findIndex((command) => command.startsWith('git add ')) >
        compatibilityCommandCount - 1,
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
      commands.some(({ command }) => command === 'git' || command === 'npm'),
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
    `${JSON.stringify({ name: '@limitless-angular/sanity', version: '1.0.0' }, null, 2)}\n`,
  );
  writeFileSync(changelogPath, '## 1.0.0\n');

  return {
    cleanup() {
      rmSync(directory, { force: true, recursive: true });
    },
    paths: { changelogPath, packageJsonPath },
  };
}

function createCapture() {
  return (command, args) => {
    if (command === 'git' && args[0] === 'rev-parse') {
      return '';
    }

    if (command === 'git' && args[0] === 'log') {
      return '';
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

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { createReleasePlan, resolveReleaseSpecifier } from './plan.mjs';

test('release specifier accepts semver increments and explicit versions', () => {
  assert.equal(resolveReleaseSpecifier('1.2.3', 'patch'), '1.2.4');
  assert.equal(resolveReleaseSpecifier('1.2.3', 'minor'), '1.3.0');
  assert.equal(resolveReleaseSpecifier('1.2.3', '2.0.0'), '2.0.0');
  assert.equal(
    resolveReleaseSpecifier('1.2.3', 'minor', { prerelease: true }),
    '1.3.0-next.0',
  );
  assert.equal(
    resolveReleaseSpecifier('1.2.3', '2.0.0', { prerelease: true }),
    '2.0.0-next.0',
  );
  assert.equal(
    resolveReleaseSpecifier('1.2.3', '2.0.0-next.2', {
      prerelease: true,
    }),
    '2.0.0-next.2',
  );
});

test('release plan rejects explicit versions that do not move forward', () => {
  const workspace = createReleaseFixture({ version: '1.2.3' });

  try {
    assert.throws(
      () =>
        createReleasePlan({
          capture: createCapture({ gitLog: '' }),
          now: new Date('2026-06-08T00:00:00.000Z'),
          paths: workspace.paths,
          versionSpecifier: '1.2.2',
        }),
      /must be greater than the current version 1\.2\.3/,
    );
    assert.throws(
      () =>
        createReleasePlan({
          capture: createCapture({ gitLog: '' }),
          now: new Date('2026-06-08T00:00:00.000Z'),
          paths: workspace.paths,
          versionSpecifier: '1.2.3',
        }),
      /must be greater than the current version 1\.2\.3/,
    );
  } finally {
    workspace.cleanup();
  }
});

test('release plan infers the next version from conventional commits', () => {
  const workspace = createReleaseFixture();

  try {
    const plan = createReleasePlan({
      capture: createCapture({
        gitLog:
          'abc1234\x01feat(sanity): add release validation\x01\x01Alfonso\x02',
      }),
      now: new Date('2026-06-08T00:00:00.000Z'),
      paths: workspace.paths,
    });

    assert.equal(plan.currentVersion, '1.0.0');
    assert.equal(plan.nextVersion, '1.1.0');
    assert.equal(plan.npmDistTag, 'latest');
    assert.equal(
      plan.packageRepositoryUrl,
      'https://github.com/limitless-angular/limitless-angular',
    );
    assert.equal(plan.prerelease, false);
    assert.equal(plan.releaseTag, 'sanity@1.1.0');
    assert.match(plan.changelogSection, /## 1\.1\.0 \(2026-06-08\)/);
    assert.match(plan.changelogSection, /add release validation/);
  } finally {
    workspace.cleanup();
  }
});

test('prerelease plan infers next prerelease from conventional commits', () => {
  const workspace = createReleaseFixture();

  try {
    const plan = createReleasePlan({
      capture: createCapture({
        gitLog:
          'abc1234\x01feat(sanity): add release validation\x01\x01Alfonso\x02',
      }),
      now: new Date('2026-06-08T00:00:00.000Z'),
      paths: workspace.paths,
      prerelease: true,
    });

    assert.equal(plan.currentVersion, '1.0.0');
    assert.equal(plan.nextVersion, '1.1.0-next.0');
    assert.equal(plan.npmDistTag, 'next');
    assert.equal(plan.prerelease, true);
    assert.equal(plan.releaseTag, 'sanity@1.1.0-next.0');
    assert.match(plan.changelogSection, /## 1\.1\.0-next\.0 \(2026-06-08\)/);
  } finally {
    workspace.cleanup();
  }
});

test('prerelease plan increments the current prerelease train', () => {
  const workspace = createReleaseFixture({ version: '1.1.0-next.0' });

  try {
    const plan = createReleasePlan({
      capture: createCapture({
        gitLog:
          'abc1234\x01fix(sanity): tighten release validation\x01\x01Alfonso\x02',
      }),
      now: new Date('2026-06-08T00:00:00.000Z'),
      paths: workspace.paths,
      prerelease: true,
    });

    assert.equal(plan.currentVersion, '1.1.0-next.0');
    assert.equal(plan.nextVersion, '1.1.0-next.1');
    assert.equal(plan.npmDistTag, 'next');
    assert.equal(plan.releaseTag, 'sanity@1.1.0-next.1');
  } finally {
    workspace.cleanup();
  }
});

function createReleaseFixture({ version = '1.0.0' } = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'limitless-release-plan-'));
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
        version,
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

function createCapture({ gitLog }) {
  return (command, args) => {
    if (command === 'git' && args[0] === 'rev-parse') {
      return '';
    }

    if (command === 'git' && args[0] === 'log') {
      return gitLog;
    }

    throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
  };
}

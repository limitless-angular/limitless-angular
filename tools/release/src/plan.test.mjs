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
  const workspace = createReleaseFixture();

  try {
    assert.throws(
      () =>
        createReleasePlan({
          capture: createCapture({ gitLog: '', releaseTags: ['sanity@1.2.3'] }),
          now: new Date('2026-06-08T00:00:00.000Z'),
          paths: workspace.paths,
          versionSpecifier: '1.2.2',
        }),
      /must be greater than the current version 1\.2\.3/,
    );
    assert.throws(
      () =>
        createReleasePlan({
          capture: createCapture({ gitLog: '', releaseTags: ['sanity@1.2.3'] }),
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
    assert.equal(plan.sourceVersion, '0.0.0-development');
    assert.equal(
      plan.packageRepositoryUrl,
      'https://github.com/limitless-angular/limitless-angular',
    );
    assert.equal(plan.prerelease, false);
    assert.equal(plan.releaseTag, 'sanity@1.1.0');
    assert.match(plan.releaseNotes, /## 1\.1\.0 \(2026-06-08\)/);
    assert.match(plan.releaseNotes, /add release validation/);
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
    assert.match(plan.releaseNotes, /## 1\.1\.0-next\.0 \(2026-06-08\)/);
  } finally {
    workspace.cleanup();
  }
});

test('prerelease plan increments the current prerelease train', () => {
  const workspace = createReleaseFixture();

  try {
    const plan = createReleasePlan({
      capture: createCapture({
        gitLog:
          'abc1234\x01fix(sanity): tighten release validation\x01\x01Alfonso\x02',
        releaseTags: ['sanity@1.1.0-next.0', 'sanity@1.0.0'],
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

test('release plan resumes an existing release tag on HEAD', () => {
  const workspace = createReleaseFixture();

  try {
    const plan = createReleasePlan({
      capture: createCapture({
        gitLog:
          'abc1234\x01feat(sanity): add release validation\x01\x01Alfonso\x02',
        headReleaseTags: ['sanity@1.1.0-next.0'],
        releaseTags: ['sanity@1.1.0-next.0', 'sanity@1.0.0'],
      }),
      now: new Date('2026-06-08T00:00:00.000Z'),
      paths: workspace.paths,
      prerelease: true,
    });

    assert.equal(plan.currentVersion, '1.0.0');
    assert.equal(plan.nextVersion, '1.1.0-next.0');
    assert.equal(plan.existingReleaseTag, true);
    assert.equal(plan.latestTag, 'sanity@1.0.0');
    assert.equal(plan.releaseTag, 'sanity@1.1.0-next.0');
  } finally {
    workspace.cleanup();
  }
});

function createReleaseFixture() {
  const directory = mkdtempSync(join(tmpdir(), 'limitless-release-plan-'));
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
        version: '0.0.0-development',
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

function createCapture({
  gitLog,
  headReleaseTags = [],
  releaseTags = ['sanity@1.0.0'],
}) {
  return (command, args) => {
    if (command === 'git' && args[0] === 'tag' && args[1] === '--merged') {
      return releaseTags.join('\n');
    }

    if (command === 'git' && args[0] === 'tag' && args[1] === '--points-at') {
      return headReleaseTags.join('\n');
    }

    if (command === 'git' && args[0] === 'log') {
      return gitLog;
    }

    throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
  };
}

import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  assertReleasePlanSummaryMatches,
  createReleasePlan,
  releaseBumps,
  releaseIntents,
  resolveReleaseSpecifier,
  summarizeReleasePlan,
} from './plan.mjs';

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

test('stable release intent infers patch and minor releases from package commits', () => {
  const workspace = createReleaseFixture();

  try {
    const patchPlan = createReleasePlan({
      capture: createCapture({
        gitLog:
          'abc1234\x01fix(sanity): tighten release validation\x01\x01Alfonso\x02',
      }),
      now: new Date('2026-06-08T00:00:00.000Z'),
      paths: workspace.paths,
      releaseIntent: releaseIntents.stable,
    });

    assert.equal(patchPlan.nextVersion, '1.0.1');
    assert.equal(patchPlan.releaseIntent, releaseIntents.stable);
    assert.equal(patchPlan.releaseBump, releaseBumps.auto);

    const minorPlan = createReleasePlan({
      capture: createCapture({
        gitLog:
          'abc1234\x01feat(sanity): add release validation\x01\x01Alfonso\x02',
      }),
      now: new Date('2026-06-08T00:00:00.000Z'),
      paths: workspace.paths,
      releaseIntent: releaseIntents.stable,
    });

    assert.equal(minorPlan.nextVersion, '1.1.0');
  } finally {
    workspace.cleanup();
  }
});

test('stable release intent requires confirmation for major releases without prereleases', () => {
  const workspace = createReleaseFixture();

  try {
    assert.throws(
      () =>
        createReleasePlan({
          capture: createCapture({
            gitLog:
              'abc1234\x01feat(sanity)!: add Angular 22 support\x01BREAKING CHANGE: Angular 19 is no longer supported.\x01Alfonso\x02',
          }),
          now: new Date('2026-06-08T00:00:00.000Z'),
          paths: workspace.paths,
          releaseIntent: releaseIntents.stable,
        }),
      /Refusing to publish major stable release 2\.0\.0 without a prerelease train/,
    );

    const plan = createReleasePlan({
      allowMajorWithoutPrerelease: true,
      capture: createCapture({
        gitLog:
          'abc1234\x01feat(sanity)!: add Angular 22 support\x01BREAKING CHANGE: Angular 19 is no longer supported.\x01Alfonso\x02',
      }),
      now: new Date('2026-06-08T00:00:00.000Z'),
      paths: workspace.paths,
      releaseIntent: releaseIntents.stable,
    });

    assert.equal(plan.nextVersion, '2.0.0');
    assert.equal(plan.npmDistTag, 'latest');
  } finally {
    workspace.cleanup();
  }
});

test('stable release intent refuses to guess when latest release is a prerelease', () => {
  const workspace = createReleaseFixture();

  try {
    assert.throws(
      () =>
        createReleasePlan({
          bump: releaseBumps.patch,
          capture: createCapture({
            gitLog: '',
            releaseTags: ['sanity@2.0.0-next.0', 'sanity@1.0.0'],
          }),
          now: new Date('2026-06-08T00:00:00.000Z'),
          paths: workspace.paths,
          releaseIntent: releaseIntents.stable,
        }),
      /Latest release tag sanity@2\.0\.0-next\.0 is a prerelease/,
    );
  } finally {
    workspace.cleanup();
  }
});

test('prerelease intent supports explicit major release trains without typing a version', () => {
  const workspace = createReleaseFixture();

  try {
    const plan = createReleasePlan({
      bump: releaseBumps.major,
      capture: createCapture({ gitLog: '' }),
      now: new Date('2026-06-08T00:00:00.000Z'),
      paths: workspace.paths,
      releaseIntent: releaseIntents.prerelease,
    });

    assert.equal(plan.currentVersion, '1.0.0');
    assert.equal(plan.nextVersion, '2.0.0-next.0');
    assert.equal(plan.npmDistTag, 'next');
    assert.equal(plan.prerelease, true);
    assert.equal(plan.releaseTag, 'sanity@2.0.0-next.0');
  } finally {
    workspace.cleanup();
  }
});

test('promote-stable intent derives stable version from latest prerelease train', () => {
  const workspace = createReleaseFixture();

  try {
    const plan = createReleasePlan({
      capture: createCapture({
        gitLogs: {
          'sanity@2.0.0-next.1..HEAD': '',
          'sanity@1.0.0..HEAD': [
            'abc1234\x01feat(sanity): add Angular 22 support\x01\x01Alfonso',
            'def5678\x01fix(sanity): handle live preview initialization\x01\x01Blanca',
          ].join('\x02'),
        },
        releaseTags: [
          'sanity@2.0.0-next.1',
          'sanity@2.0.0-next.0',
          'sanity@1.0.0',
        ],
      }),
      now: new Date('2026-06-08T00:00:00.000Z'),
      paths: workspace.paths,
      releaseIntent: releaseIntents.promoteStable,
    });

    assert.equal(plan.currentVersion, '2.0.0-next.1');
    assert.equal(plan.nextVersion, '2.0.0');
    assert.equal(plan.releaseIntent, releaseIntents.promoteStable);
    assert.equal(plan.releaseBump, releaseBumps.auto);
    assert.equal(plan.releaseNotesBaseTag, 'sanity@1.0.0');
    assert.equal(plan.releaseNotesCommits.length, 2);
  } finally {
    workspace.cleanup();
  }
});

test('promote-stable intent rejects package commits after the latest prerelease', () => {
  const workspace = createReleaseFixture();

  try {
    assert.throws(
      () =>
        createReleasePlan({
          capture: createCapture({
            gitLog:
              'abc1234\x01fix(sanity): change package after prerelease\x01\x01Alfonso\x02',
            releaseTags: ['sanity@2.0.0-next.0', 'sanity@1.0.0'],
          }),
          now: new Date('2026-06-08T00:00:00.000Z'),
          paths: workspace.paths,
          releaseIntent: releaseIntents.promoteStable,
        }),
      /package-impacting commit\(s\) landed after that prerelease/,
    );
  } finally {
    workspace.cleanup();
  }
});

test('promote-stable intent allows package documentation commits after the latest prerelease', () => {
  const workspace = createReleaseFixture();

  try {
    const plan = createReleasePlan({
      capture: createCapture({
        changedFiles: {
          abc1234: ['packages/sanity/README.md'],
        },
        gitLogs: {
          'sanity@2.0.0-next.0..HEAD':
            'abc1234\x01docs(sanity): update Angular compatibility table\x01\x01Alfonso\x02',
          'sanity@1.0.0..HEAD':
            'def5678\x01feat(sanity): add Angular 22 support\x01\x01Alfonso\x02',
        },
        releaseTags: ['sanity@2.0.0-next.0', 'sanity@1.0.0'],
      }),
      now: new Date('2026-06-08T00:00:00.000Z'),
      paths: workspace.paths,
      releaseIntent: releaseIntents.promoteStable,
    });

    assert.equal(plan.nextVersion, '2.0.0');
    assert.equal(plan.releaseNotesBaseTag, 'sanity@1.0.0');
    assert.equal(plan.commits.length, 1);
  } finally {
    workspace.cleanup();
  }
});

test('manual release intent requires an exact version and reason', () => {
  const workspace = createReleaseFixture();

  try {
    assert.throws(
      () =>
        createReleasePlan({
          capture: createCapture({ gitLog: '' }),
          manualVersion: '1.1.0',
          now: new Date('2026-06-08T00:00:00.000Z'),
          paths: workspace.paths,
          releaseIntent: releaseIntents.manual,
        }),
      /requires --manual-reason/,
    );

    const plan = createReleasePlan({
      capture: createCapture({ gitLog: '' }),
      manualReason: 'Recover from an external release-state mismatch.',
      manualVersion: '1.1.0',
      now: new Date('2026-06-08T00:00:00.000Z'),
      paths: workspace.paths,
      releaseIntent: releaseIntents.manual,
    });

    assert.equal(plan.nextVersion, '1.1.0');
    assert.equal(plan.releaseIntent, releaseIntents.manual);
    assert.equal(plan.releaseBump, 'manual');
  } finally {
    workspace.cleanup();
  }
});

test('release plan summary comparison reports publish-time drift', () => {
  assert.doesNotThrow(() =>
    assertReleasePlanSummaryMatches(
      {
        commitCount: 1,
        currentVersion: '1.0.0',
        headSha: 'abc123',
        latestTag: 'sanity@1.0.0',
        nextVersion: '1.0.1',
        npmDistTag: 'latest',
        packageName: '@limitless-angular/sanity',
        prerelease: false,
        releaseBump: releaseBumps.auto,
        releaseIntent: releaseIntents.stable,
        releaseNotesBaseTag: 'sanity@1.0.0',
        releaseNotesCommitCount: 1,
        releaseTag: 'sanity@1.0.1',
      },
      {
        commitCount: 1,
        currentVersion: '1.0.0',
        headSha: 'abc123',
        latestTag: 'sanity@1.0.0',
        nextVersion: '1.0.1',
        npmDistTag: 'latest',
        packageName: '@limitless-angular/sanity',
        prerelease: false,
        releaseBump: releaseBumps.auto,
        releaseIntent: releaseIntents.stable,
        releaseNotesBaseTag: 'sanity@1.0.0',
        releaseNotesCommitCount: 1,
        releaseTag: 'sanity@1.0.1',
      },
    ),
  );

  assert.throws(
    () =>
      assertReleasePlanSummaryMatches(
        {
          commitCount: 1,
          currentVersion: '1.0.0',
          headSha: 'abc123',
          latestTag: 'sanity@1.0.0',
          nextVersion: '1.0.1',
          npmDistTag: 'latest',
          packageName: '@limitless-angular/sanity',
          prerelease: false,
          releaseBump: releaseBumps.auto,
          releaseIntent: releaseIntents.stable,
          releaseNotesBaseTag: 'sanity@1.0.0',
          releaseNotesCommitCount: 1,
          releaseTag: 'sanity@1.0.1',
        },
        {
          commitCount: 1,
          currentVersion: '1.0.0',
          headSha: 'def456',
          latestTag: 'sanity@1.0.0',
          nextVersion: '1.1.0',
          npmDistTag: 'latest',
          packageName: '@limitless-angular/sanity',
          prerelease: false,
          releaseBump: releaseBumps.auto,
          releaseIntent: releaseIntents.stable,
          releaseNotesBaseTag: 'sanity@1.0.0',
          releaseNotesCommitCount: 1,
          releaseTag: 'sanity@1.1.0',
        },
      ),
    /nextVersion expected "1\.0\.1", found "1\.1\.0"/,
  );
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

test('release plan infers from package path changes without a package scope', () => {
  const workspace = createReleaseFixture();

  try {
    const plan = createReleasePlan({
      capture: createCapture({
        changedFiles: {
          abc1234: ['packages/sanity/src/index.ts'],
        },
        gitLog: 'abc1234\x01feat: add portable text support\x01\x01Alfonso\x02',
      }),
      now: new Date('2026-06-08T00:00:00.000Z'),
      paths: workspace.paths,
    });

    assert.equal(plan.nextVersion, '1.1.0');
    assert.equal(plan.commits.length, 1);
    assert.match(plan.releaseNotes, /add portable text support/);
  } finally {
    workspace.cleanup();
  }
});

test('release plan ignores tooling-only conventional commits', () => {
  const workspace = createReleaseFixture();

  try {
    assert.throws(
      () =>
        createReleasePlan({
          capture: createCapture({
            changedFiles: {
              abc1234: ['tools/release/src/plan.mjs'],
            },
            gitLog:
              'abc1234\x01feat(release): publish from tags without source version churn\x01\x01Alfonso\x02',
            releaseTags: ['sanity@20.0.0-next.0', 'sanity@19.2.0'],
          }),
          now: new Date('2026-06-08T00:00:00.000Z'),
          paths: workspace.paths,
          prerelease: true,
        }),
      /No release version could be determined for @limitless-angular\/sanity/,
    );
  } finally {
    workspace.cleanup();
  }
});

test('release plan ignores configured infrastructure scopes on source-only package metadata', () => {
  const workspace = createReleaseFixture();

  try {
    assert.throws(
      () =>
        createReleasePlan({
          capture: createCapture({
            changedFiles: {
              abc1234: [
                'packages/sanity/CHANGELOG.md',
                'packages/sanity/package.json',
              ],
            },
            changedJsonFiles: {
              abc1234: {
                'packages/sanity/package.json': {
                  after: createPackageManifest({
                    private: true,
                    version: '0.0.0-development',
                  }),
                  before: createPackageManifest({
                    private: false,
                    version: '19.2.0',
                  }),
                },
              },
            },
            gitLog:
              'abc1234\x01feat(release): publish from tags without source version churn\x01\x01Alfonso\x02',
            releaseTags: ['sanity@20.0.0-next.0', 'sanity@19.2.0'],
          }),
          now: new Date('2026-06-08T00:00:00.000Z'),
          paths: workspace.paths,
          prerelease: true,
        }),
      /No release version could be determined for @limitless-angular\/sanity/,
    );
  } finally {
    workspace.cleanup();
  }
});

test('release plan includes infrastructure-scoped package manifest consumer changes', () => {
  const workspace = createReleaseFixture();

  try {
    const plan = createReleasePlan({
      capture: createCapture({
        changedFiles: {
          abc1234: ['packages/sanity/package.json'],
        },
        changedJsonFiles: {
          abc1234: {
            'packages/sanity/package.json': {
              after: createPackageManifest({
                peerDependencies: {
                  '@angular/core': '^19.0.0 || ^20.0.0 || ^21.0.0',
                },
              }),
              before: createPackageManifest({
                peerDependencies: {
                  '@angular/core': '^19.0.0 || ^20.0.0',
                },
              }),
            },
          },
        },
        gitLog:
          'abc1234\x01fix(release): expand Angular peer dependency range\x01\x01Alfonso\x02',
      }),
      now: new Date('2026-06-08T00:00:00.000Z'),
      paths: workspace.paths,
    });

    assert.equal(plan.nextVersion, '1.0.1');
    assert.equal(plan.commits.length, 1);
    assert.match(plan.releaseNotes, /expand Angular peer dependency range/);
  } finally {
    workspace.cleanup();
  }
});

test('release plan includes configured infrastructure scopes on package source changes', () => {
  const workspace = createReleaseFixture();

  try {
    const plan = createReleasePlan({
      capture: createCapture({
        changedFiles: {
          abc1234: ['packages/sanity/src/index.ts'],
        },
        gitLog:
          'abc1234\x01feat(release): add portable text support\x01\x01Alfonso\x02',
      }),
      now: new Date('2026-06-08T00:00:00.000Z'),
      paths: workspace.paths,
    });

    assert.equal(plan.nextVersion, '1.1.0');
    assert.equal(plan.commits.length, 1);
    assert.match(plan.releaseNotes, /add portable text support/);
  } finally {
    workspace.cleanup();
  }
});

test('release plan includes infrastructure-scoped commits with mixed metadata and source changes', () => {
  const workspace = createReleaseFixture();

  try {
    const plan = createReleasePlan({
      capture: createCapture({
        changedFiles: {
          abc1234: [
            'packages/sanity/package.json',
            'packages/sanity/src/index.ts',
          ],
        },
        gitLog:
          'abc1234\x01fix(release): handle live preview initialization\x01\x01Alfonso\x02',
      }),
      now: new Date('2026-06-08T00:00:00.000Z'),
      paths: workspace.paths,
    });

    assert.equal(plan.nextVersion, '1.0.1');
    assert.equal(plan.commits.length, 1);
    assert.match(plan.releaseNotes, /handle live preview initialization/);
  } finally {
    workspace.cleanup();
  }
});

test('release plan keeps notes scoped to package-relevant commits', () => {
  const workspace = createReleaseFixture();

  try {
    const plan = createReleasePlan({
      capture: createCapture({
        changedFiles: {
          abc1234: ['tools/release/src/plan.mjs'],
          def5678: ['packages/sanity/src/index.ts'],
        },
        gitLog: [
          'abc1234\x01feat(release): publish from tags without source version churn\x01\x01Alfonso',
          'def5678\x01fix: handle live preview initialization\x01\x01Alfonso',
        ].join('\x02'),
      }),
      now: new Date('2026-06-08T00:00:00.000Z'),
      paths: workspace.paths,
    });

    assert.equal(plan.nextVersion, '1.0.1');
    assert.equal(plan.commits.length, 1);
    assert.match(plan.releaseNotes, /handle live preview initialization/);
    assert.doesNotMatch(plan.releaseNotes, /publish from tags/);
  } finally {
    workspace.cleanup();
  }
});

test('release notes include breaking change descriptions', () => {
  const workspace = createReleaseFixture();

  try {
    const plan = createReleasePlan({
      allowMajorWithoutPrerelease: true,
      capture: createCapture({
        gitLog: [
          'abc1234',
          'feat(sanity): add Angular 20 support',
          [
            'BREAKING CHANGE: Angular 17 is no longer supported.',
            'Consumers must use Angular 18 or newer.',
            '',
            '* [autofix.ci] apply automated fixes',
            'Refs: #123',
          ].join('\n'),
          'Alfonso',
        ].join('\x01'),
      }),
      now: new Date('2026-06-08T00:00:00.000Z'),
      paths: workspace.paths,
    });

    assert.equal(plan.nextVersion, '2.0.0');
    assert.match(plan.releaseNotes, /### ⚠️ Breaking Changes/);
    assert.match(plan.releaseNotes, /- add Angular 20 support/);
    assert.match(
      plan.releaseNotes,
      / {2}- Angular 17 is no longer supported\. Consumers must use Angular 18 or newer\./,
    );
    assert.doesNotMatch(plan.releaseNotes, /autofix/);
    assert.doesNotMatch(plan.releaseNotes, /Refs: #123/);
  } finally {
    workspace.cleanup();
  }
});

test('explicit release versions bypass package relevance inference', () => {
  const workspace = createReleaseFixture();

  try {
    const plan = createReleasePlan({
      capture: createCapture({
        changedFiles: {
          abc1234: ['tools/release/src/plan.mjs'],
        },
        gitLog:
          'abc1234\x01feat(release): publish from tags without source version churn\x01\x01Alfonso\x02',
      }),
      now: new Date('2026-06-08T00:00:00.000Z'),
      paths: workspace.paths,
      versionSpecifier: '1.1.0',
    });

    assert.equal(plan.nextVersion, '1.1.0');
    assert.equal(plan.commits.length, 0);
    assert.doesNotMatch(plan.releaseNotes, /publish from tags/);
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
    assert.equal(plan.releaseNotesBaseTag, 'sanity@1.1.0-next.0');
    assert.equal(plan.releaseNotesCommits.length, 1);
    assert.equal(plan.releaseTag, 'sanity@1.1.0-next.1');
  } finally {
    workspace.cleanup();
  }
});

test('stable release notes include the full prerelease train', () => {
  const workspace = createReleaseFixture();

  try {
    const plan = createReleasePlan({
      capture: createCapture({
        gitLogs: {
          'sanity@1.1.0-next.1..HEAD': '',
          'sanity@1.0.0..HEAD': [
            'abc1234\x01feat(sanity): add portable text support\x01\x01Alfonso',
            'def5678\x01fix(sanity): handle live preview initialization\x01\x01Blanca',
            'fed9876\x01feat(release): publish from tags without source version churn\x01\x01Alfonso',
          ].join('\x02'),
        },
        releaseTags: [
          'sanity@1.1.0-next.1',
          'sanity@1.1.0-next.0',
          'sanity@1.0.0',
        ],
      }),
      now: new Date('2026-06-08T00:00:00.000Z'),
      paths: workspace.paths,
      versionSpecifier: '1.1.0',
    });

    assert.equal(plan.currentVersion, '1.1.0-next.1');
    assert.equal(plan.nextVersion, '1.1.0');
    assert.equal(plan.latestTag, 'sanity@1.1.0-next.1');
    assert.equal(plan.commits.length, 0);
    assert.equal(plan.releaseNotesBaseTag, 'sanity@1.0.0');
    assert.equal(plan.releaseNotesCommits.length, 2);
    assert.match(plan.releaseNotes, /add portable text support/);
    assert.match(plan.releaseNotes, /handle live preview initialization/);
    assert.doesNotMatch(plan.releaseNotes, /publish from tags/);

    const summary = summarizeReleasePlan(plan);

    assert.equal(summary.releaseNotesBaseTag, 'sanity@1.0.0');
    assert.equal(summary.releaseNotesCommitCount, 2);
  } finally {
    workspace.cleanup();
  }
});

test('stable release resume keeps notes based on the previous stable tag', () => {
  const workspace = createReleaseFixture();

  try {
    const plan = createReleasePlan({
      capture: createCapture({
        gitLogs: {
          'sanity@1.1.0-next.1..HEAD': '',
          'sanity@1.0.0..HEAD':
            'abc1234\x01feat(sanity): add portable text support\x01\x01Alfonso\x02',
        },
        headReleaseTags: ['sanity@1.1.0'],
        releaseTags: ['sanity@1.1.0', 'sanity@1.1.0-next.1', 'sanity@1.0.0'],
      }),
      now: new Date('2026-06-08T00:00:00.000Z'),
      paths: workspace.paths,
    });

    assert.equal(plan.existingReleaseTag, true);
    assert.equal(plan.currentVersion, '1.1.0-next.1');
    assert.equal(plan.nextVersion, '1.1.0');
    assert.equal(plan.releaseNotesBaseTag, 'sanity@1.0.0');
    assert.equal(plan.releaseNotesCommits.length, 1);
    assert.match(plan.releaseNotes, /add portable text support/);
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

function createPackageManifest(overrides = {}) {
  return {
    name: '@limitless-angular/sanity',
    peerDependencies: {
      '@angular/core': '^19.0.0 || ^20.0.0',
    },
    private: false,
    version: '19.2.0',
    ...overrides,
  };
}

function createCapture({
  changedFiles = {},
  changedJsonFiles = {},
  gitLog,
  gitLogs = {},
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
      return gitLogs[args[1]] ?? gitLog;
    }

    if (command === 'git' && args[0] === 'diff-tree') {
      return (changedFiles[args.at(-1)] ?? []).join('\n');
    }

    if (command === 'git' && args[0] === 'show') {
      return captureGitShow(args[1], changedJsonFiles);
    }

    throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
  };
}

function captureGitShow(ref, changedJsonFiles) {
  const separatorIndex = ref.indexOf(':');
  const revision = ref.slice(0, separatorIndex);
  const file = ref.slice(separatorIndex + 1);
  const before = revision.endsWith('^');
  const hash = before ? revision.slice(0, -1) : revision;
  const change = changedJsonFiles[hash]?.[file];
  const json = before ? change?.before : change?.after;

  if (json === undefined) {
    throw new Error(`Missing git show fixture for ${ref}`);
  }

  return JSON.stringify(json);
}

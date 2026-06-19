import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { renderReleaseSummary } from './summary.mjs';

test('release summary renders a completed release plan', () => {
  const workspace = createSummaryFixture();

  try {
    writeFileSync(
      workspace.planPath,
      `${JSON.stringify({
        commitCount: 2,
        headSha: 'abc123',
        nextVersion: '22.0.0',
        npmDistTag: 'latest',
        packageName: '@limitless-angular/sanity',
        releaseBump: 'auto',
        releaseIntent: 'promote-stable',
        releaseNotesBaseTag: 'sanity@21.0.0',
        releaseNotesCommitCount: 2,
        releaseTag: 'sanity@22.0.0',
      })}\n`,
    );
    writeFileSync(
      workspace.notesPath,
      '## 22.0.0\n\n- add Angular 22 support\n',
    );

    const summary = renderReleaseSummary({
      env: createSummaryEnv({
        RELEASE_MODE: 'validation',
        RELEASE_NOTES_PATH: workspace.notesPath,
        RELEASE_PLAN_PATH: workspace.planPath,
      }),
    });

    assert.match(summary, /## Release Validation Summary/);
    assert.match(summary, /- Package: @limitless-angular\/sanity/);
    assert.match(summary, /- Planned version: 22\.0\.0/);
    assert.match(summary, /## Future GitHub Release Notes/);
    assert.match(summary, /add Angular 22 support/);
  } finally {
    workspace.cleanup();
  }
});

test('release summary tolerates an empty failed plan file', () => {
  const workspace = createSummaryFixture();

  try {
    writeFileSync(workspace.planPath, '');

    const summary = renderReleaseSummary({
      env: createSummaryEnv({
        RELEASE_MODE: 'validation',
        RELEASE_PLAN_PATH: workspace.planPath,
      }),
    });

    assert.match(summary, /## Release Validation Summary/);
    assert.match(
      summary,
      /- Planned version: unavailable; release planning did not complete\./,
    );
    assert.match(summary, /- Release plan file: empty\./);
  } finally {
    workspace.cleanup();
  }
});

test('release summary tolerates invalid plan JSON', () => {
  const workspace = createSummaryFixture();

  try {
    writeFileSync(workspace.planPath, '{');

    const summary = renderReleaseSummary({
      env: createSummaryEnv({
        RELEASE_MODE: 'dry-run',
        RELEASE_PLAN_PATH: workspace.planPath,
      }),
    });

    assert.match(summary, /## Release Dry Run Summary/);
    assert.match(summary, /Release plan file: invalid JSON/);
  } finally {
    workspace.cleanup();
  }
});

function createSummaryFixture() {
  const directory = mkdtempSync(join(tmpdir(), 'limitless-release-summary-'));

  return {
    cleanup() {
      rmSync(directory, { force: true, recursive: true });
    },
    notesPath: join(directory, 'release-notes.md'),
    planPath: join(directory, 'release-plan.json'),
  };
}

function createSummaryEnv(overrides = {}) {
  return {
    RELEASE_ALLOW_MAJOR_WITHOUT_PRERELEASE: 'false',
    RELEASE_BUMP: 'auto',
    RELEASE_INTENT: 'prerelease',
    RELEASE_MANUAL_VERSION: '',
    RELEASE_MODE: 'validation',
    RELEASE_OUTCOME: 'skipped',
    ...overrides,
  };
}

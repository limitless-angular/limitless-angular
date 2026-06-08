import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { createReleasePlan, resolveReleaseSpecifier } from './src/plan.mjs';

test('release specifier accepts semver increments and explicit versions', () => {
  assert.equal(resolveReleaseSpecifier('1.2.3', 'patch'), '1.2.4');
  assert.equal(resolveReleaseSpecifier('1.2.3', 'minor'), '1.3.0');
  assert.equal(resolveReleaseSpecifier('1.2.3', '2.0.0'), '2.0.0');
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
    assert.equal(plan.releaseTag, 'sanity@1.1.0');
    assert.match(plan.changelogSection, /## 1\.1\.0 \(2026-06-08\)/);
    assert.match(plan.changelogSection, /add release validation/);
  } finally {
    workspace.cleanup();
  }
});

function createReleaseFixture() {
  const directory = mkdtempSync(join(tmpdir(), 'limitless-release-plan-'));
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

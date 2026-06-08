import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  evaluateSanityCompatEligibility,
  printSanityCompatEligibility,
} from './eligibility.mjs';

test('force runs compatibility checks without reading git state', () => {
  const result = evaluateSanityCompatEligibility({
    capture() {
      throw new Error('capture should not be called');
    },
    force: true,
  });

  assert.equal(result.run, true);
  assert.equal(result.reason, 'Forced by workflow_dispatch.');
});

test('matching compatibility contract paths run without invoking Turbo', () => {
  const { calls, capture } = createCapture();

  const result = evaluateSanityCompatEligibility({
    baseRef: 'base',
    capture,
    changedFiles: ['README.md', '.github/workflows/ci.yml'],
  });

  assert.equal(result.run, true);
  assert.match(result.reason, /Compatibility contract paths changed/);
  assert.deepEqual(
    result.matchedPaths.map(({ file }) => file),
    ['.github/workflows/ci.yml'],
  );
  assert.equal(
    calls.some(({ command }) => command === 'pnpm'),
    false,
  );
});

test('release tooling changes run without invoking Turbo', () => {
  const { calls, capture } = createCapture();

  const result = evaluateSanityCompatEligibility({
    baseRef: 'base',
    capture,
    changedFiles: [
      '.github/workflows/release-dry-run.yml',
      'tools/release/src/pipeline.mjs',
    ],
  });

  assert.equal(result.run, true);
  assert.deepEqual(
    result.matchedPaths.map(({ file }) => file),
    ['.github/workflows/release-dry-run.yml', 'tools/release/src/pipeline.mjs'],
  );
  assert.equal(
    calls.some(({ command }) => command === 'pnpm'),
    false,
  );
});

test('unmatched files skip when Turbo reports the package is unaffected', () => {
  const { calls, capture } = createCapture({ gitDiff: 'CONTRIBUTING.md\n' });

  const result = evaluateSanityCompatEligibility({
    baseRef: 'base',
    capture,
    headRef: 'head',
  });

  assert.equal(result.run, false);
  assert.deepEqual(result.changedFiles, ['CONTRIBUTING.md']);
  assert.match(result.reason, /unaffected/);

  const turboCall = calls.find(({ command }) => command === 'pnpm');
  assert.deepEqual(turboCall.args, [
    'turbo',
    'run',
    'build',
    'test',
    '--filter=@limitless-angular/sanity',
    '--filter=@limitless-angular/angular-compat',
    '--affected',
    '--dry=json',
  ]);
  assert.equal(turboCall.options.env.TURBO_SCM_BASE, 'base');
});

test('unmatched files run when Turbo reports compatibility tasks are affected', () => {
  const { capture } = createCapture({
    turboTasks: [
      '@limitless-angular/sanity#build',
      '@limitless-angular/sanity#test',
      '@limitless-angular/sanity#transit',
      '@limitless-angular/angular-compat#build',
      '@limitless-angular/angular-compat#test',
    ],
  });

  const result = evaluateSanityCompatEligibility({
    baseRef: 'base',
    capture,
    changedFiles: ['docs/compatibility.md'],
  });

  assert.equal(result.run, true);
  assert.deepEqual(result.turboTasks, [
    '@limitless-angular/sanity#build',
    '@limitless-angular/sanity#test',
    '@limitless-angular/angular-compat#test',
  ]);
  assert.match(result.reason, /Turbo reports compatibility packages/);
});

test('Turbo failures fail open', () => {
  const { capture } = createCapture({
    turboError: new Error('dry run failed'),
  });

  const result = evaluateSanityCompatEligibility({
    baseRef: 'base',
    capture,
    changedFiles: ['docs/compatibility.md'],
  });

  assert.equal(result.run, true);
  assert.match(result.reason, /Unable to evaluate Turbo affected state/);
});

test('GitHub outputs are written for workflow consumption', (context) => {
  context.mock.method(console, 'log', () => {});

  const directory = mkdtempSync(join(tmpdir(), 'sanity-compat-eligibility-'));
  const outputPath = join(directory, 'github-output');

  try {
    printSanityCompatEligibility({
      force: true,
      githubOutput: outputPath,
    });

    assert.equal(
      readFileSync(outputPath, 'utf8'),
      'run=true\nreason=Forced by workflow_dispatch.\n',
    );
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});

function createCapture({
  gitDiff = 'docs/compatibility.md\n',
  turboError,
  turboTasks = [],
} = {}) {
  const calls = [];

  return {
    calls,
    capture(command, args, options = {}) {
      calls.push({ args, command, options });

      if (command === 'git' && args[0] === 'cat-file') {
        return '';
      }

      if (command === 'git' && args[0] === 'diff') {
        return gitDiff;
      }

      if (command === 'pnpm' && args[0] === 'turbo') {
        if (turboError) {
          throw turboError;
        }

        return `Packages in scope\n${JSON.stringify({
          tasks: turboTasks.map((taskId) => ({
            command:
              taskId === '@limitless-angular/angular-compat#build' ||
              taskId.endsWith('#transit')
                ? '<NONEXISTENT>'
                : `run ${taskId}`,
            taskId,
          })),
        })}`;
      }

      throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
    },
  };
}

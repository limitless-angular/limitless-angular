import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { readJson, workspaceRoot } from './lib.mjs';

const compatPackageName = '@limitless-angular/angular-compat';
const compatFilter = `--filter=${compatPackageName}`;
const compatPackageDir = 'tools/angular-compat';
const releasePackageName = '@limitless-angular/release-tools';
const releaseFilter = `--filter=${releasePackageName}`;

const turboCompatCommand = (task, { forwardsArgs = false } = {}) =>
  `pnpm turbo run ${task} ${compatFilter}${forwardsArgs ? ' --' : ''}`;
const turboReleaseCommand = (task, { forwardsArgs = false } = {}) =>
  `pnpm turbo run ${task} ${releaseFilter}${forwardsArgs ? ' --' : ''}`;

const rootScriptContract = {
  compat: turboCompatCommand('compat:pipeline'),
  'compat:affected': turboCompatCommand('compat:affected', {
    forwardsArgs: true,
  }),
  'compat:affected:test': `pnpm turbo run test ${compatFilter}`,
  'compat:assert': turboCompatCommand('compat:assert'),
  'compat:artifact': turboCompatCommand('compat:artifact', {
    forwardsArgs: true,
  }),
  'compat:canary-report': turboCompatCommand('compat:canary-report', {
    forwardsArgs: true,
  }),
  'compat:canary-status': turboCompatCommand('compat:canary-status', {
    forwardsArgs: true,
  }),
  'compat:matrix': `pnpm --filter=${compatPackageName} run --silent compat:matrix`,
  'compat:pack': turboCompatCommand('compat:pack'),
  'compat:release-parity': turboCompatCommand('compat:release-parity'),
  'compat:test': turboCompatCommand('compat:test', { forwardsArgs: true }),
};

const rootReleaseScriptContract = {
  release: turboReleaseCommand('release', { forwardsArgs: true }),
  'release:dry-run': turboReleaseCommand('release:dry-run', {
    forwardsArgs: true,
  }),
  'release:plan': `pnpm --filter=${releasePackageName} run --silent release:plan`,
  'release:publish': turboReleaseCommand('release:publish', {
    forwardsArgs: true,
  }),
};

const packageScriptContract = {
  'compat:affected': 'node cli.mjs affected',
  'compat:artifact': 'node cli.mjs artifact',
  'compat:assert': 'node cli.mjs assert',
  'compat:canary-report': 'node cli.mjs canary-report',
  'compat:canary-status': 'node cli.mjs canary-status',
  'compat:matrix': 'node cli.mjs matrix',
  'compat:pack': 'node cli.mjs pack',
  'compat:pipeline': 'node cli.mjs run',
  'compat:release-parity': 'node cli.mjs release-parity',
  'compat:test': 'node cli.mjs test',
  test: 'node --test *.test.mjs',
};

const compatTurboTasks = [
  'compat:affected',
  'compat:assert',
  'compat:artifact',
  'compat:canary-report',
  'compat:canary-status',
  'compat:pack',
  'compat:pipeline',
  'compat:release-parity',
  'compat:test',
];

const legacyPackageScriptNames = [
  'affected',
  'artifact',
  'assert',
  'canary-report',
  'canary-status',
  'consumer',
  'matrix',
  'pack',
  'pipeline',
  'release-parity',
];

test('root compat scripts route package lifecycle tasks through Turbo', () => {
  const { scripts } = readWorkspaceJson('package.json');

  assert.deepEqual(pick(scripts, Object.keys(rootScriptContract)), {
    ...rootScriptContract,
  });
  assert.doesNotMatch(scripts['compat:matrix'], /turbo/);
});

test('root release scripts route side-effecting tasks through Turbo', () => {
  const { scripts } = readWorkspaceJson('package.json');

  assert.deepEqual(pick(scripts, Object.keys(rootReleaseScriptContract)), {
    ...rootReleaseScriptContract,
  });
  assert.doesNotMatch(
    scripts['release:plan'],
    /turbo/,
    'release:plan supports clean JSON output and should remain a direct package command',
  );
});

test('compat package scripts own the CLI command mapping', () => {
  const { scripts } = readWorkspaceJson(`${compatPackageDir}/package.json`);

  assert.deepEqual(pick(scripts, Object.keys(packageScriptContract)), {
    ...packageScriptContract,
  });

  for (const scriptName of legacyPackageScriptNames) {
    assert.equal(
      scripts[scriptName],
      undefined,
      `${scriptName} should stay namespaced under compat:*`,
    );
  }
});

test('compat-only Turbo task settings are scoped to the compat package', () => {
  const rootTurbo = readWorkspaceJson('turbo.json');
  const compatTurbo = readWorkspaceJson(`${compatPackageDir}/turbo.json`);

  assert.deepEqual(compatTurbo.extends, ['//']);
  assert.equal(
    Object.keys(rootTurbo.tasks).some((task) => task.startsWith('compat:')),
    false,
    'root turbo.json should keep shared tasks only',
  );

  for (const task of compatTurboTasks) {
    assert.deepEqual(compatTurbo.tasks[task], { cache: false });
  }

  assert.equal(
    compatTurbo.tasks['compat:matrix'],
    undefined,
    'matrix prints clean JSON and should remain a direct package command',
  );
});

test('CI workflow follows the compat orchestration contract', () => {
  const workflow = readWorkspaceText('.github/workflows/ci.yml');

  assertIncludes(workflow, [
    `pnpm turbo run test ${compatFilter}`,
    `${turboCompatCommand('compat:affected', {
      forwardsArgs: true,
    })} --force --github-output "$GITHUB_OUTPUT"`,
    `${turboCompatCommand('compat:affected', {
      forwardsArgs: true,
    })} --base-ref "$base_ref" --github-output "$GITHUB_OUTPUT"`,
    turboCompatCommand('compat:assert'),
    turboCompatCommand('compat:release-parity'),
    `pnpm --filter=${compatPackageName} run --silent compat:matrix`,
    `pnpm --filter=${compatPackageName} run --silent compat:matrix --canary`,
    turboCompatCommand('compat:pack'),
    turboCompatCommand('compat:artifact'),
    `pnpm --dir ${compatPackageDir} exec playwright install --with-deps chromium`,
    `${turboCompatCommand('compat:test', {
      forwardsArgs: true,
    })} --set \${{ matrix.version_set.id }}`,
    `${turboCompatCommand('compat:test', {
      forwardsArgs: true,
    })} --set "\${{ matrix.version_set.id }}" --metadata-out "$metadata_path"`,
    turboCompatCommand('compat:canary-status', { forwardsArgs: true }),
  ]);

  assert.doesNotMatch(workflow, /pnpm run compat:/);
  assert.doesNotMatch(workflow, /turbo run compat:matrix/);
});

test('release workflows delegate to the release tools package', () => {
  const publishWorkflow = readWorkspaceText(
    '.github/workflows/release-and-publish.yml',
  );
  const dryRunWorkflow = readWorkspaceText(
    '.github/workflows/release-dry-run.yml',
  );

  assertIncludes(publishWorkflow, [
    turboReleaseCommand('release:publish', { forwardsArgs: true }),
    'environment: npm-release',
    'id-token: write',
    'echo "RELEASE_PLAN_PATH=$RUNNER_TEMP/release-plan.json" >> "$GITHUB_ENV"',
    'npm install -g npm@^11.10.0',
    'NPM_CONFIG_PROVENANCE: true',
  ]);
  assertIncludes(dryRunWorkflow, [
    turboReleaseCommand('release:dry-run', { forwardsArgs: true }),
    'permissions:',
    'contents: read',
    'echo "RELEASE_PLAN_PATH=$RUNNER_TEMP/release-plan.json" >> "$GITHUB_ENV"',
  ]);

  assert.doesNotMatch(publishWorkflow, /runner\.temp/);
  assert.doesNotMatch(publishWorkflow, /compat:pack/);
  assert.doesNotMatch(publishWorkflow, /npm publish/);
  assert.doesNotMatch(publishWorkflow, /registry-url/);
  assert.doesNotMatch(publishWorkflow, /NODE_AUTH_TOKEN/);
  assert.doesNotMatch(publishWorkflow, /NPM_ACCESS_TOKEN/);
  assert.doesNotMatch(dryRunWorkflow, /runner\.temp/);
  assert.doesNotMatch(dryRunWorkflow, /NODE_AUTH_TOKEN/);
  assert.doesNotMatch(dryRunWorkflow, /NPM_ACCESS_TOKEN/);
});

test('release tools package owns the release command mapping', () => {
  const { scripts } = readWorkspaceJson('tools/release/package.json');

  assert.deepEqual(
    pick(scripts, [
      'release',
      'release:dry-run',
      'release:plan',
      'release:publish',
      'test',
    ]),
    {
      release: 'node cli.mjs run',
      'release:dry-run': 'node cli.mjs dry-run',
      'release:plan': 'node cli.mjs plan',
      'release:publish': 'node cli.mjs publish',
      test: 'node --test src/*.test.mjs',
    },
  );
});

test('release-only Turbo task settings are scoped to the release package', () => {
  const rootTurbo = readWorkspaceJson('turbo.json');
  const releaseTurbo = readWorkspaceJson('tools/release/turbo.json');

  assert.deepEqual(releaseTurbo.extends, ['//']);
  assert.equal(
    Object.keys(rootTurbo.tasks).some((task) => task.startsWith('release:')),
    false,
    'root turbo.json should keep shared tasks only',
  );

  for (const task of ['release:dry-run', 'release:plan']) {
    assert.deepEqual(releaseTurbo.tasks[task], { cache: false });
  }
  const trustedPublishTaskConfig = {
    cache: false,
    passThroughEnv: [
      'ACTIONS_ID_TOKEN_REQUEST_*',
      'GITHUB_*',
      'NPM_CONFIG_PROVENANCE',
      'RELEASE_BRANCH',
    ],
  };

  assert.deepEqual(releaseTurbo.tasks.release, trustedPublishTaskConfig);
  assert.deepEqual(
    releaseTurbo.tasks['release:publish'],
    trustedPublishTaskConfig,
  );
});

function readWorkspaceJson(path) {
  return readJson(join(workspaceRoot, path));
}

function readWorkspaceText(path) {
  return readFileSync(join(workspaceRoot, path), 'utf8');
}

function pick(object, keys) {
  return Object.fromEntries(keys.map((key) => [key, object[key]]));
}

function assertIncludes(text, expectedSnippets) {
  for (const snippet of expectedSnippets) {
    assert.ok(text.includes(snippet), `Expected to find: ${snippet}`);
  }
}

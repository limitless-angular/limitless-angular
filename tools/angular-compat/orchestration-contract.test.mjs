import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { parse as parseYaml } from 'yaml';

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
  'release:notes': `pnpm --filter=${releasePackageName} run --silent release:notes`,
  'release:plan': `pnpm --filter=${releasePackageName} run --silent release:plan`,
  'release:publish': turboReleaseCommand('release:publish', {
    forwardsArgs: true,
  }),
  'release:verify-plan': `pnpm --filter=${releasePackageName} run --silent release:verify-plan`,
};

const packageScriptContract = {
  'compat:affected': 'node cli.mjs affected',
  'compat:artifact': 'node cli.mjs artifact',
  'compat:assert': 'node cli.mjs assert',
  'compat:canary-report': 'node cli.mjs canary-report',
  'compat:canary-status': 'node cli.mjs canary-status',
  'compat:matrix': 'node cli.mjs matrix',
  'compat:pack': 'node cli.mjs pack',
  'compat:prepare-publish': 'node cli.mjs prepare-publish',
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
const releaseVersionAwareCompatTasks = new Set([
  'compat:artifact',
  'compat:pack',
  'compat:test',
]);

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
    assert.deepEqual(
      compatTurbo.tasks[task],
      releaseVersionAwareCompatTasks.has(task)
        ? { cache: false, passThroughEnv: ['LIMITLESS_RELEASE_VERSION'] }
        : { cache: false },
    );
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

test('autofix workflow prepares built packages before preview publishing', () => {
  const workflow = readWorkspaceText('.github/workflows/autofix.yml');

  assertIncludes(workflow, [
    "pnpm --filter=@limitless-angular/angular-compat run --silent compat:prepare-publish -- --package-root './dist/packages/sanity'",
    "pnpx pkg-pr-new publish --compact './dist/packages/sanity'",
  ]);
  assert.match(
    workflow,
    /compat:prepare-publish[\s\S]+pkg-pr-new publish/,
    'autofix must strip source-only private metadata before pkg-pr-new reads dist/package.json',
  );
});

test('release workflows delegate to the release tools package', () => {
  const publishWorkflowPath = '.github/workflows/release-and-publish.yml';
  const dryRunWorkflowPath = '.github/workflows/release-dry-run.yml';
  const publishWorkflowText = readWorkspaceText(publishWorkflowPath);
  const dryRunWorkflowText = readWorkspaceText(dryRunWorkflowPath);
  const publishWorkflow = readWorkspaceWorkflow(publishWorkflowPath);
  const dryRunWorkflow = readWorkspaceWorkflow(dryRunWorkflowPath);
  const validateJob = getWorkflowJob(publishWorkflow, 'validate-release');
  const publishJob = getWorkflowJob(publishWorkflow, 'release-and-publish');
  const dryRunJob = getWorkflowJob(dryRunWorkflow, 'release-dry-run');
  const validateSetupNodeStep = getWorkflowStep(
    validateJob,
    'Install Node.js per package.json',
  );
  const publishSetupNodeStep = getWorkflowStep(
    publishJob,
    'Install Node.js per package.json',
  );

  assert.equal(publishJob.needs, 'validate-release');
  assert.equal(getWorkflowEnvironmentName(publishJob), 'npm-release');
  assert.equal(
    publishJob.environment.url,
    '${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}',
  );
  assert.equal(publishJob.permissions['id-token'], 'write');
  assert.equal(publishJob.permissions.contents, 'write');
  assert.equal(validateJob.permissions.contents, 'read');
  assert.equal(dryRunJob.permissions.contents, 'read');
  assert.equal(
    validateSetupNodeStep.with?.['registry-url'],
    'https://registry.npmjs.org/',
  );
  assert.equal(
    publishSetupNodeStep.with?.['registry-url'],
    undefined,
    'trusted publishing job must not configure npm auth through setup-node',
  );

  assertJobRuns(validateJob, [
    `pnpm --filter=${releasePackageName} run --silent release:plan`,
    `pnpm --filter=${releasePackageName} run --silent release:notes`,
    turboReleaseCommand('release:dry-run', { forwardsArgs: true }),
  ]);
  assertJobRuns(publishJob, [
    'npm install -g npm@^11.10.0',
    `pnpm --filter=${releasePackageName} run --silent release:plan`,
    `pnpm --filter=${releasePackageName} run --silent release:verify-plan`,
    turboReleaseCommand('release:publish', { forwardsArgs: true }),
  ]);
  assertJobRuns(dryRunJob, [
    `pnpm --filter=${releasePackageName} run --silent release:plan`,
    `pnpm --filter=${releasePackageName} run --silent release:notes`,
    turboReleaseCommand('release:dry-run', { forwardsArgs: true }),
  ]);

  assertIncludes(publishWorkflowText, [
    'NPM_CONFIG_PROVENANCE: true',
    'Future GitHub Release Notes',
  ]);
  assertIncludes(dryRunWorkflowText, ['Future GitHub Release Notes']);

  assert.doesNotMatch(publishWorkflowText, /runner\.temp/);
  assert.doesNotMatch(publishWorkflowText, /compat:pack/);
  assert.doesNotMatch(publishWorkflowText, /npm publish/);
  assert.doesNotMatch(publishWorkflowText, /NODE_AUTH_TOKEN/);
  assert.doesNotMatch(publishWorkflowText, /NPM_ACCESS_TOKEN/);
  assert.doesNotMatch(dryRunWorkflowText, /runner\.temp/);
  assert.doesNotMatch(dryRunWorkflowText, /NODE_AUTH_TOKEN/);
  assert.doesNotMatch(dryRunWorkflowText, /NPM_ACCESS_TOKEN/);
});

test('legacy release workflow text contract remains documented', () => {
  const publishWorkflow = readWorkspaceText(
    '.github/workflows/release-and-publish.yml',
  );
  const dryRunWorkflow = readWorkspaceText(
    '.github/workflows/release-dry-run.yml',
  );

  assertIncludes(publishWorkflow, [
    'echo "RELEASE_PLAN_PATH=$RUNNER_TEMP/release-plan.json" >> "$GITHUB_ENV"',
  ]);
  assertIncludes(dryRunWorkflow, [
    'echo "RELEASE_PLAN_PATH=$RUNNER_TEMP/release-plan.json" >> "$GITHUB_ENV"',
  ]);
});

test('release tools package owns the release command mapping', () => {
  const { scripts } = readWorkspaceJson('tools/release/package.json');

  assert.deepEqual(
    pick(scripts, [
      'release',
      'release:dry-run',
      'release:notes',
      'release:plan',
      'release:publish',
      'release:verify-plan',
      'test',
    ]),
    {
      release: 'node cli.mjs run',
      'release:dry-run': 'node cli.mjs dry-run',
      'release:notes': 'node cli.mjs notes',
      'release:plan': 'node cli.mjs plan',
      'release:publish': 'node cli.mjs publish',
      'release:verify-plan': 'node cli.mjs verify-plan',
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

function readWorkspaceWorkflow(path) {
  return parseYaml(readWorkspaceText(path));
}

function getWorkflowJob(workflow, jobName) {
  const job = workflow.jobs?.[jobName];

  assert.ok(job, `Expected workflow job: ${jobName}`);

  return job;
}

function getWorkflowEnvironmentName(job) {
  return typeof job.environment === 'string'
    ? job.environment
    : job.environment?.name;
}

function getWorkflowStep(job, stepName) {
  const step = job.steps.find((candidate) => candidate.name === stepName);

  assert.ok(step, `Expected workflow step: ${stepName}`);

  return step;
}

function assertJobRuns(job, expectedSnippets) {
  const runScripts = job.steps
    .map((step) => step.run)
    .filter((run) => typeof run === 'string')
    .join('\n');

  assertIncludes(runScripts, expectedSnippets);
}

function pick(object, keys) {
  return Object.fromEntries(keys.map((key) => [key, object[key]]));
}

function assertIncludes(text, expectedSnippets) {
  for (const snippet of expectedSnippets) {
    assert.ok(text.includes(snippet), `Expected to find: ${snippet}`);
  }
}

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';

const workspaceRoot = resolve(import.meta.dirname, '../../..');
const envFile = resolve(
  workspaceRoot,
  'apps/sanity-presentation-e2e/.env.local',
);
const command = process.argv[2];
const origin = process.argv[3] ?? 'http://localhost:3333';

if (command !== 'add' && command !== 'list') {
  console.error(
    'Usage: node apps/sanity-presentation-e2e/scripts/sanity-cors.mjs <add|list> [origin]',
  );
  process.exit(1);
}

if (existsSync(envFile)) {
  loadEnvFile(envFile);
}

const projectId = requiredEnv('SANITY_E2E_PROJECT_ID');
const dataset = requiredEnv('SANITY_E2E_DATASET');
const env = {
  ...process.env,
  SANITY_STUDIO_PROJECT_ID: projectId,
  SANITY_STUDIO_DATASET: dataset,
};

const args =
  command === 'add'
    ? [
        '--dir=apps/sanity-presentation-e2e-studio',
        'sanity',
        'cors',
        'add',
        origin,
        '--credentials',
      ]
    : ['--dir=apps/sanity-presentation-e2e-studio', 'sanity', 'cors', 'list'];

const result = spawnSync('pnpm', args, {
  cwd: workspaceRoot,
  encoding: 'utf8',
  env,
});

if (command === 'add' && didReportDuplicateOrigin(result)) {
  console.log(
    `CORS origin ${origin} is already configured for project ${projectId}.`,
  );
  process.exit(0);
}

if (result.stdout) {
  process.stdout.write(result.stdout);
}

if (result.stderr) {
  process.stderr.write(result.stderr);
}

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);

function didReportDuplicateOrigin(result) {
  return (
    result.status !== 0 &&
    `${result.stdout ?? ''}${result.stderr ?? ''}`.includes(
      'Duplicate origin already exists for this project',
    )
  );
}

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    console.error(
      `Missing ${name}. Set it in the shell, CI env, or apps/sanity-presentation-e2e/.env.local.`,
    );
    process.exit(1);
  }

  return value;
}

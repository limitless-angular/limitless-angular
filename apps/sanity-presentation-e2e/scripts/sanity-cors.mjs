import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const workspaceRoot = resolve(import.meta.dirname, '../../..');
const command = process.argv[2];
const origin = process.argv[3] ?? 'http://localhost:3333';

if (command !== 'add' && command !== 'list') {
  console.error(
    'Usage: node apps/sanity-presentation-e2e/scripts/sanity-cors.mjs <add|list> [origin]',
  );
  process.exit(1);
}

const fileEnv = loadEnvFiles([
  resolve(workspaceRoot, 'apps/analog-sanity-blog-example/.env.local'),
  resolve(workspaceRoot, 'apps/sanity-presentation-e2e/.env.local'),
]);
const env = {
  ...fileEnv,
  ...process.env,
};

env.SANITY_STUDIO_PROJECT_ID ??= env.VITE_SANITY_PROJECT_ID;
env.SANITY_STUDIO_DATASET ??= env.VITE_SANITY_DATASET;

for (const name of ['SANITY_STUDIO_PROJECT_ID', 'SANITY_STUDIO_DATASET']) {
  if (!env[name]) {
    console.error(
      `Missing ${name}. Set it or the matching VITE_SANITY_* value in .env.local.`,
    );
    process.exit(1);
  }
}

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
    `CORS origin ${origin} is already configured for project ${env.SANITY_STUDIO_PROJECT_ID}.`,
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

function loadEnvFiles(paths) {
  return paths.reduce((acc, path) => {
    if (!existsSync(path)) {
      return acc;
    }

    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([\w.-]+)\s*=\s*(.*)?\s*$/);

      if (!match) {
        continue;
      }

      const [, key, rawValue = ''] = match;

      if (!key || key.startsWith('#')) {
        continue;
      }

      acc[key] = parseEnvValue(rawValue);
    }

    return acc;
  }, {});
}

function parseEnvValue(rawValue) {
  const value = rawValue.trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value.replace(/\s+#.*$/, '');
}

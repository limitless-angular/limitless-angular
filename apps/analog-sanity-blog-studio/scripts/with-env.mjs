import { spawnSync } from 'node:child_process';

import {
  loadBlogStudioEnv,
  requireBlogStudioEnv,
  studioRoot,
} from './env.mjs';

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error('Usage: node scripts/with-env.mjs <command> [...args]');
  process.exit(1);
}

const env = loadBlogStudioEnv();

requireBlogStudioEnv(env, [
  'SANITY_STUDIO_PROJECT_ID',
  'SANITY_STUDIO_DATASET',
]);

const result = spawnSync(command, args, {
  cwd: studioRoot,
  encoding: 'utf8',
  env,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);

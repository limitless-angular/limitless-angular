import { spawnSync } from 'node:child_process';

import {
  blogStudioProjectEnvNames,
  loadBlogStudioEnv,
  requireBlogStudioEnv,
  studioRoot,
} from './env.mjs';

const args = process.argv.slice(2);
const requireProjectEnv = args[0] === '--require-project';

if (requireProjectEnv) {
  args.shift();
}

const [command, ...commandArgs] = args;

if (!command) {
  console.error(
    'Usage: node scripts/with-env.mjs [--require-project] <command> [...args]',
  );
  process.exit(1);
}

const env = loadBlogStudioEnv();

if (requireProjectEnv) {
  requireBlogStudioEnv(env, blogStudioProjectEnvNames);
}

const result = spawnSync(command, commandArgs, {
  cwd: studioRoot,
  encoding: 'utf8',
  env,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);

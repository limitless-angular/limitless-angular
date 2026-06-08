import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';

export const workspaceRoot = resolve(import.meta.dirname, '../../..');
export const studioRoot = resolve(
  workspaceRoot,
  'apps/analog-sanity-blog-studio',
);
const envFile = resolve(studioRoot, '.env.local');

export const blogStudioProjectEnvNames = [
  'SANITY_STUDIO_PROJECT_ID',
  'SANITY_STUDIO_DATASET',
];

export function loadBlogStudioEnv(overrides = process.env) {
  if (existsSync(envFile)) {
    loadEnvFile(envFile);
  }

  const env = {
    ...process.env,
    ...overrides,
  };

  env.SANITY_STUDIO_PREVIEW_ORIGIN ??= 'http://localhost:4200';
  env.SANITY_STUDIO_ORIGIN ??= 'http://localhost:3333';

  return env;
}

export function requireBlogStudioEnv(env, names) {
  const missing = names.filter((name) => !env[name]);

  if (missing.length > 0) {
    console.error(
      `Missing ${missing.join(', ')}. Set them in the shell or apps/analog-sanity-blog-studio/.env.local.`,
    );
    process.exit(1);
  }
}

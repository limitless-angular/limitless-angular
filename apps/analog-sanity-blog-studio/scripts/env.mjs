import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const workspaceRoot = resolve(import.meta.dirname, '../../..');
export const studioRoot = resolve(
  workspaceRoot,
  'apps/analog-sanity-blog-studio',
);

const envFiles = [
  resolve(workspaceRoot, 'apps/analog-sanity-blog-example/.env.local'),
  resolve(studioRoot, '.env.local'),
];

export function loadBlogStudioEnv(overrides = process.env) {
  const env = {
    ...loadEnvFiles(envFiles),
    ...overrides,
  };

  env.SANITY_STUDIO_PROJECT_ID ??= env.VITE_SANITY_PROJECT_ID;
  env.SANITY_STUDIO_DATASET ??= env.VITE_SANITY_DATASET;
  env.SANITY_STUDIO_PREVIEW_ORIGIN ??= 'http://localhost:4200';
  env.SANITY_STUDIO_ORIGIN ??= 'http://localhost:3333';
  env.VITE_SANITY_STUDIO_URL ??= env.SANITY_STUDIO_ORIGIN;

  return env;
}

export function requireBlogStudioEnv(env, names) {
  const missing = names.filter((name) => !env[name]);

  if (missing.length > 0) {
    console.error(
      `Missing ${missing.join(', ')}. Set them in the shell, apps/analog-sanity-blog-example/.env.local, or apps/analog-sanity-blog-studio/.env.local.`,
    );
    process.exit(1);
  }
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

import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const envFileValues = loadEnvFiles([
  resolve(workspaceRoot, 'apps/analog-sanity-blog-example/.env.local'),
  resolve(workspaceRoot, 'apps/sanity-presentation-e2e/.env.local'),
]);

for (const [key, value] of Object.entries(envFileValues)) {
  process.env[key] ??= value;
}

const previewPort = Number(process.env['SANITY_E2E_PREVIEW_PORT'] ?? 4200);
const studioPort = Number(process.env['SANITY_E2E_STUDIO_PORT'] ?? 3333);
const previewURL = `http://localhost:${previewPort}`;
const studioURL = `http://localhost:${studioPort}`;
const requestedStorageStatePath = optionalEnv('SANITY_E2E_STORAGE_STATE');
const studioMode =
  process.env['SANITY_E2E_STUDIO_MODE'] ??
  (process.env['SANITY_E2E_REAL_STUDIO'] === '1' ? 'real-project' : 'off');
const useRealProject = studioMode === 'real-project';
const isAuthSetup = process.env['SANITY_E2E_AUTH_SETUP'] === '1';
const cdpEndpoint = optionalEnv('SANITY_E2E_CDP_ENDPOINT');
const storageStatePath =
  isAuthSetup || !useRealProject
    ? undefined
    : existingStorageStatePath(requestedStorageStatePath);
const browserChannel =
  (isAuthSetup ? optionalEnv('SANITY_E2E_BROWSER_CHANNEL') : undefined) ??
  (isAuthSetup && !cdpEndpoint && !process.env['CI'] ? 'chrome' : undefined);
const browserProjectName = cdpEndpoint ? 'cdp' : (browserChannel ?? 'chromium');
const desktopChromeUse = {
  ...devices['Desktop Chrome'],
  ...(browserChannel ? { channel: browserChannel } : {}),
};

const previewEnv = useRealProject
  ? {
      VITE_SANITY_PROJECT_ID: requiredEnv('VITE_SANITY_PROJECT_ID'),
      VITE_SANITY_DATASET: requiredEnv('VITE_SANITY_DATASET'),
      VITE_SANITY_API_VERSION: process.env['VITE_SANITY_API_VERSION'],
      VITE_SANITY_STUDIO_URL: studioURL,
      SANITY_API_READ_TOKEN: requiredEnv('SANITY_API_READ_TOKEN'),
      SANITY_PRESENTATION_E2E_REAL_CLIENT: '1',
      BYPASS_TOKEN: requiredEnv('BYPASS_TOKEN'),
    }
  : {
      VITE_SANITY_PROJECT_ID: 'presentation-smoke-project',
      VITE_SANITY_DATASET: 'presentation-smoke-dataset',
      VITE_SANITY_STUDIO_URL: studioURL,
      SANITY_API_READ_TOKEN: 'presentation-smoke-read-token',
      SANITY_PRESENTATION_E2E_BYPASS_DRAFT: '1',
      BYPASS_TOKEN: 'presentation-smoke-bypass-token',
    };

const webServer = [
  {
    cwd: workspaceRoot,
    command: [
      ...toShellEnv(previewEnv),
      'pnpm turbo run serve --filter=analog-sanity-blog-example',
    ].join(' '),
    url: `${previewURL}/api/presentation-smoke-health`,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
];

if (studioMode !== 'off') {
  const studioProjectId = useRealProject
    ? (process.env['SANITY_STUDIO_PROJECT_ID'] ??
      requiredEnv('VITE_SANITY_PROJECT_ID'))
    : 'presentation-smoke-project';
  const studioDataset = useRealProject
    ? (process.env['SANITY_STUDIO_DATASET'] ??
      requiredEnv('VITE_SANITY_DATASET'))
    : 'presentation-smoke-dataset';

  webServer.push({
    cwd: workspaceRoot,
    command: [
      ...toShellEnv({
        SANITY_STUDIO_PROJECT_ID: studioProjectId,
        SANITY_STUDIO_DATASET: studioDataset,
        SANITY_STUDIO_PREVIEW_ORIGIN: previewURL,
      }),
      'pnpm turbo run serve --filter=sanity-presentation-e2e-studio',
    ].join(' '),
    url: studioURL,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  });
}

export default defineConfig({
  testDir: './tests',
  testIgnore: isAuthSetup ? [] : ['**/*.setup.ts'],
  testMatch: ['**/*.spec.ts', '**/*.setup.ts'],
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: previewURL,
    storageState: storageStatePath,
    trace: 'retain-on-failure',
    ...desktopChromeUse,
  },
  reporter: [['list']],
  webServer,
  projects: [
    {
      name: browserProjectName,
      use: desktopChromeUse,
    },
  ],
});

function loadEnvFiles(paths: string[]): Record<string, string> {
  return paths.reduce<Record<string, string>>((acc, path) => {
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

function parseEnvValue(rawValue: string): string {
  const value = rawValue.trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value.replace(/\s+#.*$/, '');
}

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in the shell, CI env, apps/analog-sanity-blog-example/.env.local, or apps/sanity-presentation-e2e/.env.local.`,
    );
  }

  return value;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();

  return value || undefined;
}

function existingStorageStatePath(
  path: string | undefined,
): string | undefined {
  if (!path) {
    return undefined;
  }

  const absolutePath = isAbsolute(path) ? path : resolve(workspaceRoot, path);

  if (existsSync(absolutePath)) {
    return absolutePath;
  }

  const message = `SANITY_E2E_STORAGE_STATE points to ${path}, but the file does not exist. Run the auth setup first or unset SANITY_E2E_STORAGE_STATE.`;

  if (process.env['CI']) {
    throw new Error(message);
  }

  console.warn(message);
  return undefined;
}

function toShellEnv(env: Record<string, string | undefined>): string[] {
  return Object.entries(env)
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`);
}

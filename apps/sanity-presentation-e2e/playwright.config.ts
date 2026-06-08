import { existsSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const envFile = resolve(
  workspaceRoot,
  'apps/sanity-presentation-e2e/.env.local',
);

if (existsSync(envFile)) {
  loadEnvFile(envFile);
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
      VITE_SANITY_PROJECT_ID: requiredEnv('SANITY_E2E_PROJECT_ID'),
      VITE_SANITY_DATASET: requiredEnv('SANITY_E2E_DATASET'),
      VITE_SANITY_API_VERSION: optionalEnv('SANITY_E2E_API_VERSION'),
      VITE_SANITY_STUDIO_URL: studioURL,
      SANITY_API_READ_TOKEN: requiredEnv('SANITY_E2E_READ_TOKEN'),
      SANITY_PRESENTATION_E2E_REAL_CLIENT: '1',
      BYPASS_TOKEN: requiredEnv('SANITY_E2E_BYPASS_TOKEN'),
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
    command: `pnpm --dir apps/analog-sanity-blog-example exec vite dev --host 0.0.0.0 --port ${previewPort}`,
    env: definedEnv(previewEnv),
    url: `${previewURL}/api/presentation-smoke-health`,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
];

if (studioMode !== 'off') {
  const studioProjectId = useRealProject
    ? requiredEnv('SANITY_E2E_PROJECT_ID')
    : 'presentation-smoke-project';
  const studioDataset = useRealProject
    ? requiredEnv('SANITY_E2E_DATASET')
    : 'presentation-smoke-dataset';

  webServer.push({
    cwd: workspaceRoot,
    command: `pnpm --dir apps/sanity-presentation-e2e-studio exec sanity dev --host 0.0.0.0 --port ${studioPort}`,
    env: definedEnv({
      SANITY_STUDIO_PROJECT_ID: studioProjectId,
      SANITY_STUDIO_DATASET: studioDataset,
      SANITY_STUDIO_PREVIEW_ORIGIN: previewURL,
    }),
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

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in the shell, CI env, or apps/sanity-presentation-e2e/.env.local.`,
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

function definedEnv(
  env: Record<string, string | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
}

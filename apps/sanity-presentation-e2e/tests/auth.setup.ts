import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  chromium,
  expect,
  test,
  type BrowserContext,
  type Page,
} from '@playwright/test';

const studioURL =
  process.env['SANITY_E2E_STUDIO_URL'] ?? 'http://localhost:3333';
const storageStatePath =
  process.env['SANITY_E2E_STORAGE_STATE'] ??
  'apps/sanity-presentation-e2e/.auth/sanity-storage-state.json';
const authTimeout = numberEnv('SANITY_E2E_AUTH_TIMEOUT_MS', 10 * 60_000);
const cdpEndpoint = optionalEnv('SANITY_E2E_CDP_ENDPOINT');

test.skip(
  process.env['SANITY_E2E_AUTH_SETUP'] !== '1',
  'Set SANITY_E2E_AUTH_SETUP=1 to capture Sanity Studio auth state.',
);

if (cdpEndpoint) {
  test(
    'capture Sanity Studio auth state from existing Chrome',
    async ({ browserName }, testInfo) => {
      testInfo.setTimeout(authTimeout + 30_000);

      if (!browserName) {
        throw new Error('Unable to read the Playwright browser name.');
      }

      const browser = await chromium.connectOverCDP(cdpEndpoint);
      const context = browser.contexts()[0];

      if (!context) {
        throw new Error(`No browser context found at ${cdpEndpoint}.`);
      }

      const page = await context.newPage();
      await captureAuthState(page, context);
    },
  );
} else {
  test('capture Sanity Studio auth state', async ({ page }, testInfo) => {
    testInfo.setTimeout(authTimeout + 30_000);

    await captureAuthState(page, page.context());
  });
}

function numberEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);

  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();

  return value || undefined;
}

async function captureAuthState(
  page: Page,
  context: BrowserContext,
): Promise<void> {
  await page.goto(`${studioURL}/presentation`);

  await expect
    .poll(
      () =>
        page.frames().some((frame) => frame.url().includes('/presentation-smoke')),
      {
        timeout: authTimeout,
      },
    )
    .toBe(true);

  const absoluteStorageStatePath = resolve(storageStatePath);
  await mkdir(dirname(absoluteStorageStatePath), { recursive: true });
  await context.storageState({ path: absoluteStorageStatePath });
}

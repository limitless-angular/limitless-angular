import { expect, test, type Page } from '@playwright/test';

const studioURL =
  process.env['SANITY_E2E_STUDIO_URL'] ?? 'http://localhost:3333';
const studioMode =
  process.env['SANITY_E2E_STUDIO_MODE'] ??
  (process.env['SANITY_E2E_REAL_STUDIO'] === '1' ? 'real-project' : 'off');
const projectId = 'presentation-smoke-project';
const dataset = 'presentation-smoke-dataset';
const documentId = 'presentation-smoke-post';
const localRealProjectTimeout = numberEnv(
  'SANITY_E2E_REAL_PROJECT_TIMEOUT_MS',
  10 * 60_000,
);

async function mockSanityApi(page: Page): Promise<void> {
  const corsHeaders = {
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-origin': studioURL,
  };

  await page.route(
    new RegExp(`https://${projectId}\\.(api|apicdn)\\.sanity\\.io/.*`),
    async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders });
        return;
      }

      const body = url.pathname.includes('/users/me')
        ? {
            id: 'presentation-smoke-user',
            name: 'Presentation Smoke User',
            email: 'presentation-smoke@example.com',
            profileImage: null,
            roles: [{ name: 'administrator', title: 'Administrator' }],
          }
        : url.pathname.includes(`/data/query/${dataset}`)
          ? {
              ms: 0,
              query: url.searchParams.get('query') ?? '',
              result: {
                _id: documentId,
                _type: 'post',
                _createdAt: '2024-01-01T00:00:00.000Z',
                _updatedAt: '2024-01-01T00:00:00.000Z',
                _rev: 'presentation-smoke-rev',
                title: 'Live presentation smoke title',
              },
            }
          : url.pathname.includes('/datasets')
            ? [{ name: dataset }]
            : {};

      await route.fulfill({
        body: JSON.stringify(body),
        contentType: 'application/json',
        headers: corsHeaders,
        status: 200,
      });
    },
  );
}

test.skip(
  studioMode === 'off',
  'Set SANITY_E2E_STUDIO_MODE=hermetic or SANITY_E2E_STUDIO_MODE=real-project to run the Studio smoke test.',
);

test('Sanity Studio Presentation opens the Angular preview frame', async ({
  page,
}, testInfo) => {
  const previewFrameTimeout =
    studioMode === 'real-project' && !process.env['CI']
      ? localRealProjectTimeout
      : 15_000;

  if (previewFrameTimeout > testInfo.timeout) {
    testInfo.setTimeout(previewFrameTimeout + 30_000);
  }

  if (studioMode === 'hermetic') {
    await mockSanityApi(page);
  }

  await page.goto(`${studioURL}/presentation`);

  await expect
    .poll(() =>
      page.frames().some((frame) => frame.url().includes('/presentation-smoke')),
      {
        timeout: previewFrameTimeout,
      },
    )
    .toBe(true);

  const previewFrame = page
    .frames()
    .find((frame) => frame.url().includes('/presentation-smoke'));

  if (!previewFrame) {
    throw new Error('Unable to find the Presentation smoke preview frame.');
  }

  await expect(
    previewFrame.getByTestId('presentation-smoke-kicker'),
  ).toBeVisible();
  await expect(previewFrame.getByTestId('presentation-smoke-title')).toContainText(
    'Live presentation smoke title',
  );
});

function numberEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);

  return Number.isFinite(value) && value > 0 ? value : fallback;
}

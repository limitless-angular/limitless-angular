import {
  expect,
  test,
  type Frame,
  type Locator,
  type Page,
} from '@playwright/test';
import { createClient, type SanityClient } from '@sanity/client';
import { createDataAttribute } from '@sanity/visual-editing';

const studioURL =
  process.env['SANITY_E2E_STUDIO_URL'] ?? 'http://localhost:3333';
const studioMode =
  process.env['SANITY_E2E_STUDIO_MODE'] ??
  (process.env['SANITY_E2E_REAL_STUDIO'] === '1' ? 'real-project' : 'off');
const projectId = 'presentation-smoke-project';
const dataset = 'presentation-smoke-dataset';
const documentId = 'presentation-smoke-post';
const expectedPreviewProjectId =
  studioMode === 'real-project'
    ? (process.env['SANITY_E2E_PROJECT_ID'] ?? projectId)
    : projectId;
const expectedPreviewDataset =
  studioMode === 'real-project'
    ? (process.env['SANITY_E2E_DATASET'] ?? dataset)
    : dataset;
const expectedDataSanity = createDataAttribute({
  baseUrl: studioURL,
  dataset: expectedPreviewDataset,
  id: documentId,
  path: 'title',
  projectId: expectedPreviewProjectId,
  type: 'post',
}).toString();
const localRealProjectTimeout = numberEnv(
  'SANITY_E2E_REAL_PROJECT_TIMEOUT_MS',
  10 * 60_000,
);
const studioPreviewFrameTimeout = 45_000;
const writeToken = process.env['SANITY_E2E_WRITE_TOKEN'];

type ProtocolMessage = {
  connectionId?: string;
  data?: unknown;
  domain?: string;
  from?: string;
  id?: string;
  responseTo?: string;
  to?: string;
  type?: string;
};

type PresentationSmokeFrameState = {
  __presentationSmokeBootCount?: number;
};

const hermeticUser = {
  id: 'presentation-smoke-user',
  name: 'Presentation Smoke User',
  email: 'presentation-smoke@example.com',
  profileImage: null,
  roles: [{ name: 'administrator', title: 'Administrator' }],
};

const hermeticPost = {
  _id: documentId,
  _type: 'post',
  _createdAt: '2024-01-01T00:00:00.000Z',
  _updatedAt: '2024-01-01T00:00:00.000Z',
  _rev: 'presentation-smoke-rev',
  title: 'Live presentation smoke title',
};

const hermeticDatasets = [{ name: dataset }];

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

      if (isSanityEventStream(url)) {
        await route.fulfill({
          body: ':\n\n',
          contentType: 'text/event-stream',
          headers: {
            ...corsHeaders,
            'cache-control': 'no-cache',
          },
          status: 200,
        });
        return;
      }

      const body = getSanityApiResponseBody(url);

      await route.fulfill({
        body: JSON.stringify(body),
        contentType: 'application/json',
        headers: corsHeaders,
        status: 200,
      });
    },
  );
}

function isSanityEventStream(url: URL): boolean {
  return (
    url.pathname.includes(`/data/listen/${dataset}`) ||
    url.pathname.includes(`/data/live/events/${dataset}`)
  );
}

function getSanityApiResponseBody(url: URL): unknown {
  if (url.pathname.includes('/users/me/keyvalue')) {
    return [];
  }

  if (url.pathname.includes('/users/me')) {
    return hermeticUser;
  }

  if (
    url.pathname.includes('/user-applications') ||
    url.pathname.includes('/access/requests/me') ||
    url.pathname.includes(`/datasets/${dataset}/acl`)
  ) {
    return [];
  }

  if (url.pathname.endsWith(`/projects/${projectId}/datasets`)) {
    return hermeticDatasets;
  }

  if (url.pathname.includes(`/data/doc/${dataset}/${documentId}`)) {
    return hermeticPost;
  }

  if (url.pathname.includes(`/data/query/${dataset}`)) {
    const query = url.searchParams.get('query') ?? '';

    return {
      ms: 0,
      query,
      result: getHermeticQueryResult(query),
    };
  }

  return {};
}

function getHermeticQueryResult(query: string): unknown {
  if (isPresentationSecretQuery(query)) {
    return null;
  }

  if (query.includes(documentId) || query.includes('_type == "post"')) {
    return hermeticPost;
  }

  return null;
}

function isPresentationSecretQuery(query: string): boolean {
  return (
    query.includes('sanity-preview-url-secret') ||
    query.includes('sanity.previewUrlSecret') ||
    query.includes('sanity.vercelProtectionBypass') ||
    query.includes('vercel-protection-bypass')
  );
}

async function installMessageRecorder(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (
      window as unknown as {
        __sanityPresentationE2EMessages: unknown[];
      }
    ).__sanityPresentationE2EMessages = [];

    window.addEventListener('message', (event) => {
      const data = event.data;

      if (!data || typeof data !== 'object' || !('type' in data)) {
        return;
      }

      try {
        (
          window as unknown as {
            __sanityPresentationE2EMessages: unknown[];
          }
        ).__sanityPresentationE2EMessages.push(
          JSON.parse(JSON.stringify(data)),
        );
      } catch {
        (
          window as unknown as {
            __sanityPresentationE2EMessages: unknown[];
          }
        ).__sanityPresentationE2EMessages.push({
          domain: 'domain' in data ? String(data.domain) : undefined,
          from: 'from' in data ? String(data.from) : undefined,
          to: 'to' in data ? String(data.to) : undefined,
          type: 'type' in data ? String(data.type) : undefined,
        });
      }
    });
  });
}

async function getPresentationMessages(page: Page): Promise<ProtocolMessage[]> {
  try {
    return await page.evaluate(
      () =>
        (
          window as unknown as {
            __sanityPresentationE2EMessages: ProtocolMessage[];
          }
        ).__sanityPresentationE2EMessages ?? [],
    );
  } catch {
    return [];
  }
}

async function waitForMessage(
  page: Page,
  matcher: (message: ProtocolMessage) => boolean,
): Promise<void> {
  await expect
    .poll(async () => (await getPresentationMessages(page)).some(matcher), {
      timeout: 30_000,
    })
    .toBe(true);
}

async function openPresentationPreview(
  page: Page,
  previewFrameTimeout: number,
): Promise<Frame> {
  await installMessageRecorder(page);

  if (studioMode === 'hermetic') {
    await mockSanityApi(page);
  }

  await page.goto(`${studioURL}/presentation`);

  await expect
    .poll(
      () => page.frames().some((frame) => isPresentationSmokeFrame(frame)),
      {
        timeout: previewFrameTimeout,
      },
    )
    .toBe(true);

  return getPresentationPreviewFrame(page);
}

function findPresentationPreviewFrame(page: Page): Frame | undefined {
  return page.frames().find((frame) => isPresentationSmokeFrame(frame));
}

function getPresentationPreviewFrame(page: Page): Frame {
  const previewFrame = findPresentationPreviewFrame(page);

  if (!previewFrame) {
    throw new Error('Unable to find the Presentation smoke preview frame.');
  }

  return previewFrame;
}

async function getPresentationPreviewTitle(
  page: Page,
  timeout: number,
): Promise<Locator> {
  await expect
    .poll(
      async () => {
        const previewFrame = findPresentationPreviewFrame(page);

        if (!previewFrame) {
          return false;
        }

        return previewFrame
          .getByTestId('presentation-smoke-title')
          .isVisible({ timeout: 100 });
      },
      { timeout },
    )
    .toBe(true);

  return getPresentationPreviewFrame(page).getByTestId(
    'presentation-smoke-title',
  );
}

function isPresentationSmokeFrame(frame: Frame): boolean {
  if (!frame.parentFrame()) {
    return false;
  }

  try {
    return new URL(frame.url()).pathname === '/presentation-smoke';
  } catch {
    return false;
  }
}

function getPreviewFrameTimeout(): number {
  return studioMode === 'real-project' && !process.env['CI']
    ? localRealProjectTimeout
    : studioPreviewFrameTimeout;
}

function extendTimeoutForPreviewFrame(
  testInfo: { setTimeout: (timeout: number) => void; timeout: number },
  previewFrameTimeout: number,
): void {
  const requiredTimeout = previewFrameTimeout + 30_000;

  if (requiredTimeout > testInfo.timeout) {
    testInfo.setTimeout(requiredTimeout);
  }
}

function isLoaderConnectionMessage(message: ProtocolMessage): boolean {
  return message.type === 'handshake/syn-ack' && message.from === 'loaders';
}

function isVisualEditingConnectionMessage(message: ProtocolMessage): boolean {
  return (
    message.type === 'handshake/syn-ack' &&
    (message.from === 'visual-editing' || message.from === 'overlays')
  );
}

function parseDataSanity(value: string): Record<string, string> {
  return Object.fromEntries(
    value.split(';').map((part) => {
      const separatorIndex = part.indexOf('=');

      return separatorIndex === -1
        ? [part, '']
        : [part.slice(0, separatorIndex), part.slice(separatorIndex + 1)];
    }),
  );
}

async function getFrameBootCount(frame: Frame): Promise<number | undefined> {
  return frame.evaluate(
    () =>
      (window as unknown as PresentationSmokeFrameState)
        .__presentationSmokeBootCount,
  );
}

function createMutationClient(token: string): SanityClient {
  return createClient({
    projectId: requiredEnv('SANITY_E2E_PROJECT_ID'),
    dataset: requiredEnv('SANITY_E2E_DATASET'),
    apiVersion: process.env['SANITY_E2E_API_VERSION'] || '2024-02-28',
    token,
    useCdn: false,
    perspective: 'previewDrafts',
  });
}

async function patchDocumentTitle(
  client: SanityClient,
  id: string,
  title: string,
): Promise<void> {
  await client.patch(id).set({ title }).commit({ visibility: 'sync' });
}

test.skip(
  studioMode === 'off',
  'Set SANITY_E2E_STUDIO_MODE=hermetic or SANITY_E2E_STUDIO_MODE=real-project to run the Studio smoke test.',
);

test('Sanity Studio Presentation opens the Angular preview frame', async ({
  page,
}, testInfo) => {
  const previewFrameTimeout = getPreviewFrameTimeout();
  extendTimeoutForPreviewFrame(testInfo, previewFrameTimeout);

  await openPresentationPreview(page, previewFrameTimeout);

  const title = await getPresentationPreviewTitle(page, previewFrameTimeout);
  await expect(title).toBeVisible();
  await expect(title).not.toHaveText('');

  if (studioMode === 'real-project') {
    await expect(title).toHaveAttribute('data-client-mode', 'real-client');
    await expect(title).toHaveAttribute(
      'data-sanity',
      /^id=[^;]+;type=post;path=title;base=/,
    );
  } else {
    await expect(title).toHaveAttribute('data-client-mode', 'fake-client');
    await expect(title).toContainText('Live presentation smoke title');
    await expect(title).toHaveAttribute('data-sanity', expectedDataSanity);
  }

  await waitForMessage(page, isLoaderConnectionMessage);
  await waitForMessage(page, isVisualEditingConnectionMessage);
});

test('real Sanity mutations update Angular live preview without reloading', async ({
  page,
}, testInfo) => {
  test.skip(
    studioMode !== 'real-project',
    'Real mutation coverage only applies to SANITY_E2E_STUDIO_MODE=real-project.',
  );
  test.skip(
    !writeToken,
    'Set SANITY_E2E_WRITE_TOKEN to run the real live-update mutation test.',
  );

  const previewFrameTimeout = getPreviewFrameTimeout();
  extendTimeoutForPreviewFrame(testInfo, previewFrameTimeout);

  await openPresentationPreview(page, previewFrameTimeout);
  const title = await getPresentationPreviewTitle(page, previewFrameTimeout);

  await expect(title).not.toHaveText('');

  const dataSanity = parseDataSanity(
    (await title.getAttribute('data-sanity')) ?? '',
  );
  const liveDocumentId = dataSanity['id'];

  if (!liveDocumentId) {
    throw new Error('Unable to read the live document id from data-sanity.');
  }

  const client = createMutationClient(writeToken);
  const originalTitle = await client.fetch<string | null>(
    '*[_id == $id][0].title',
    { id: liveDocumentId },
  );

  if (typeof originalTitle !== 'string') {
    throw new Error(
      `Unable to read the current title for Sanity document ${liveDocumentId}.`,
    );
  }

  const nextTitle = `Real presentation smoke ${Date.now()}`;
  const initialBootCount = await getFrameBootCount(
    getPresentationPreviewFrame(page),
  );
  let didPatchTitle = false;

  try {
    try {
      await patchDocumentTitle(client, liveDocumentId, nextTitle);
      didPatchTitle = true;
    } catch (error) {
      if (isInsufficientUpdatePermissionError(error)) {
        throw new Error(
          'SANITY_E2E_WRITE_TOKEN is set, but it cannot update Sanity documents in this project/dataset. Use a token with document update permission to run this real mutation test, or unset SANITY_E2E_WRITE_TOKEN to skip it.',
        );
      }

      throw error;
    }

    await expect(title).toContainText(nextTitle, {
      timeout: previewFrameTimeout,
    });

    await expect
      .poll(() => getFrameBootCount(getPresentationPreviewFrame(page)), {
        timeout: 15_000,
      })
      .toBe(initialBootCount);
  } finally {
    if (didPatchTitle) {
      await patchDocumentTitle(client, liveDocumentId, originalTitle);
    }
  }
});

function numberEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);

  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}.`);
  }

  return value;
}

function isInsufficientUpdatePermissionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes('Insufficient permissions') &&
    message.includes('permission "update"')
  );
}

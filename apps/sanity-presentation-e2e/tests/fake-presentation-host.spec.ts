import {
  expect,
  test,
  type Frame,
  type Locator,
  type Page,
} from '@playwright/test';
import { createDataAttribute } from '@sanity/visual-editing';

const previewURL =
  process.env['SANITY_E2E_PREVIEW_URL'] ?? 'http://localhost:4200';
const studioURL =
  process.env['SANITY_E2E_STUDIO_URL'] ??
  `http://localhost:${process.env['SANITY_E2E_STUDIO_PORT'] ?? 3333}`;
const studioMode =
  process.env['SANITY_E2E_STUDIO_MODE'] ??
  (process.env['SANITY_E2E_REAL_STUDIO'] === '1' ? 'real-project' : 'off');
const documentId = 'presentation-smoke-post';
const expectedProjectId =
  studioMode === 'real-project'
    ? (process.env['SANITY_STUDIO_PROJECT_ID'] ??
      process.env['VITE_SANITY_PROJECT_ID'] ??
      'presentation-smoke-project')
    : 'presentation-smoke-project';
const expectedDataset =
  studioMode === 'real-project'
    ? (process.env['SANITY_STUDIO_DATASET'] ??
      process.env['VITE_SANITY_DATASET'] ??
      'presentation-smoke-dataset')
    : 'presentation-smoke-dataset';
const expectedDataSanity = createDataAttribute({
  baseUrl: studioURL,
  dataset: expectedDataset,
  id: documentId,
  path: 'title',
  projectId: expectedProjectId,
  type: 'post',
}).toString();

type ProtocolMessage = {
  connectionId?: string;
  data?: unknown;
  domain?: string;
  from?: string;
  id?: string;
  to?: string;
  type?: string;
};

type PresentationSmokeFrameState = {
  __presentationSmokeBootCount?: number;
  __presentationSmokeFetchCount?: number;
  __presentationSmokeTitle?: string;
};

async function installFakePresentationHost(page: Page): Promise<void> {
  await page.goto(`${previewURL}/presentation-smoke`);
  await page.setContent(`
    <!doctype html>
    <html>
      <head><title>Fake Presentation Host</title></head>
      <body>
        <iframe
          id="preview"
          src="${previewURL}/presentation-smoke"
          style="width: 1200px; height: 800px; border: 0"
        ></iframe>
        <script>
          window.__presentationMessages = [];
          const iframe = document.getElementById('preview');
          const targets = ['preview-kit', 'visual-editing', 'overlays'];
          const connections = new Map();

          function send(message) {
            iframe.contentWindow.postMessage(message, '${previewURL}');
          }

          function handshake(target) {
            const connectionId = connections.get(target) || 'fake-' + target;
            connections.set(target, connectionId);
            send({
              domain: 'sanity/channels',
              type: 'handshake/syn',
              from: 'presentation',
              to: target,
              connectionId,
              data: {id: connectionId}
            });
          }

          window.addEventListener('message', (event) => {
            const data = event.data || {};
            if (data && data.domain === 'sanity/channels') {
              window.__presentationMessages.push(data);
              if (data.type === 'handshake/syn-ack') {
                send({
                  domain: 'sanity/channels',
                  type: 'handshake/ack',
                  from: 'presentation',
                  to: data.from,
                  connectionId: data.connectionId,
                  data: {id: data.connectionId}
                });
              }
              if (data.id && data.type !== 'channel/response') {
                send({
                  domain: 'sanity/channels',
                  type: 'channel/response',
                  from: 'presentation',
                  to: data.from,
                  connectionId: data.connectionId,
                  id: 'response-' + data.id,
                  responseTo: data.id,
                  data: {responseTo: data.id}
                });
              }
            }
          });

          iframe.addEventListener('load', () => {
            for (const target of targets) handshake(target);
            window.__handshakeInterval = setInterval(() => {
              for (const target of targets) handshake(target);
            }, 500);
          });
        </script>
      </body>
    </html>
  `);
}

async function getPreviewFrame(page: Page): Promise<Frame> {
  await expect
    .poll(() =>
      page
        .frames()
        .some(
          (frame) =>
            frame.parentFrame() && frame.url().includes('/presentation-smoke'),
        ),
    )
    .toBe(true);

  const frame = page
    .frames()
    .find(
      (frame) =>
        frame.parentFrame() && frame.url().includes('/presentation-smoke'),
    );

  if (!frame) {
    throw new Error('Unable to find the Presentation smoke preview frame.');
  }

  return frame;
}

async function getPresentationMessages(page: Page): Promise<ProtocolMessage[]> {
  try {
    const messages = await page.evaluate(
      () =>
        (
          window as unknown as {
            __presentationMessages?: ProtocolMessage[];
          }
        ).__presentationMessages,
    );

    return Array.isArray(messages) ? messages : [];
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

async function getFrameState(
  frame: Frame,
): Promise<PresentationSmokeFrameState> {
  return frame.evaluate(() => {
    const smokeWindow = window as unknown as PresentationSmokeFrameState;

    return {
      __presentationSmokeBootCount: smokeWindow.__presentationSmokeBootCount,
      __presentationSmokeFetchCount: smokeWindow.__presentationSmokeFetchCount,
      __presentationSmokeTitle: smokeWindow.__presentationSmokeTitle,
    };
  });
}

async function setFrameTitle(frame: Frame, title: string): Promise<void> {
  await frame.evaluate((nextTitle) => {
    (
      window as unknown as PresentationSmokeFrameState
    ).__presentationSmokeTitle = nextTitle;
  }, title);
}

async function expectEditableTitleMarker(title: Locator): Promise<void> {
  await expect(title).toHaveAttribute('data-sanity', expectedDataSanity);
}

test('Angular preview announces live documents when embedded by Presentation', async ({
  page,
}) => {
  await installFakePresentationHost(page);

  const frame = page.frameLocator('#preview');
  const title = frame.getByTestId('presentation-smoke-title');

  await expect(frame.getByTestId('presentation-smoke-kicker')).toBeVisible();
  await waitForMessage(
    page,
    (message) => message.type === 'preview-kit/documents',
  );

  await expect(title).toContainText('Live presentation smoke title');
  await expectEditableTitleMarker(title);

  const documentsMessage = (await getPresentationMessages(page)).find(
    (message) => message.type === 'preview-kit/documents',
  );

  expect(documentsMessage).toMatchObject({
    from: 'preview-kit',
    to: 'presentation',
    type: 'preview-kit/documents',
  });
  expect(documentsMessage?.data).toMatchObject({
    dataset: expectedDataset,
    documents: [{ _id: 'presentation-smoke-post' }],
    perspective: 'previewDrafts',
    projectId: expectedProjectId,
  });
});

test('live preview refreshes Angular data without reloading the preview', async ({
  page,
}) => {
  await installFakePresentationHost(page);

  const frame = await getPreviewFrame(page);
  const title = frame.getByTestId('presentation-smoke-title');

  await expect(title).toContainText('Live presentation smoke title');

  const initialFrameState = await getFrameState(frame);
  await setFrameTitle(frame, 'Updated presentation smoke title');

  await expect(title).toContainText('Updated presentation smoke title');

  const updatedFrameState = await getFrameState(frame);
  expect(updatedFrameState.__presentationSmokeBootCount).toBe(
    initialFrameState.__presentationSmokeBootCount,
  );
  expect(updatedFrameState.__presentationSmokeFetchCount).toBeGreaterThan(
    initialFrameState.__presentationSmokeFetchCount ?? 0,
  );
});

test('visual editing exposes editable markers and connects to Presentation', async ({
  page,
}) => {
  await installFakePresentationHost(page);

  const frame = page.frameLocator('#preview');
  const title = frame.getByTestId('presentation-smoke-title');

  await expect(title).toContainText('Live presentation smoke title');
  await expectEditableTitleMarker(title);

  await waitForMessage(
    page,
    (message) =>
      message.type === 'handshake/syn-ack' &&
      (message.from === 'visual-editing' || message.from === 'overlays'),
  );
});

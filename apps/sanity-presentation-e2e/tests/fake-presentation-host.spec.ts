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
const liveTitle = 'Live presentation smoke title';
const expectedProjectId =
  studioMode === 'real-project'
    ? (process.env['SANITY_E2E_PROJECT_ID'] ?? 'presentation-smoke-project')
    : 'presentation-smoke-project';
const expectedDataset =
  studioMode === 'real-project'
    ? (process.env['SANITY_E2E_DATASET'] ?? 'presentation-smoke-dataset')
    : 'presentation-smoke-dataset';
const expectedDataSanity = createDataAttribute({
  baseUrl: studioURL,
  dataset: expectedDataset,
  id: documentId,
  path: 'title',
  projectId: expectedProjectId,
  type: 'post',
}).toString();

test.describe.configure({ timeout: 90_000 });

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
  __presentationSmokePerspective?: unknown;
  __presentationSmokeTitle?: string;
};

async function installFakePresentationHost(page: Page): Promise<void> {
  await page.goto(`${previewURL}/presentation-smoke`);
  await expect(page.getByTestId('presentation-smoke-title')).toContainText(
    liveTitle,
    { timeout: 45_000 },
  );

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
          const targets = ['loaders', 'visual-editing', 'overlays'];
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

          function handshakeAll() {
            for (const target of targets) handshake(target);
          }

          function startHandshakeLoop() {
            if (window.__handshakeInterval) return;
            handshakeAll();
            window.__handshakeInterval = setInterval(handshakeAll, 500);
          }

          window.__sendLoaderPerspective = function (perspective) {
            const connectionId = connections.get('loaders') || 'fake-loaders';
            connections.set('loaders', connectionId);
            send({
              domain: 'sanity/channels',
              type: 'loader/perspective',
              from: 'presentation',
              to: 'loaders',
              connectionId,
              data: {
                projectId: '${expectedProjectId}',
                dataset: '${expectedDataset}',
                perspective
              }
            });
          };

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

          iframe.addEventListener('load', startHandshakeLoop);
          startHandshakeLoop();
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
      __presentationSmokePerspective:
        smokeWindow.__presentationSmokePerspective,
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

function isLoaderConnectionMessage(message: ProtocolMessage): boolean {
  return message.type === 'handshake/syn-ack' && message.from === 'loaders';
}

async function sendLoaderPerspective(
  page: Page,
  perspective: string,
): Promise<void> {
  await page.evaluate((nextPerspective) => {
    (
      window as unknown as {
        __sendLoaderPerspective?: (perspective: string) => void;
      }
    ).__sendLoaderPerspective?.(nextPerspective);
  }, perspective);
}

test('Angular preview connects loaders and honors Presentation perspective', async ({
  page,
}) => {
  await installFakePresentationHost(page);

  const previewFrame = await getPreviewFrame(page);
  const frame = page.frameLocator('#preview');
  const title = frame.getByTestId('presentation-smoke-title');

  await expect(frame.getByTestId('presentation-smoke-kicker')).toBeVisible();
  await waitForMessage(page, isLoaderConnectionMessage);

  await expect(title).toContainText(liveTitle);
  await expectEditableTitleMarker(title);
  await expect
    .poll(
      async () =>
        (await getFrameState(previewFrame)).__presentationSmokePerspective,
    )
    .toBe('drafts');

  await sendLoaderPerspective(page, 'published');
  await expect
    .poll(
      async () =>
        (await getFrameState(previewFrame)).__presentationSmokePerspective,
    )
    .toBe('published');
});

test('live preview refreshes Angular data without reloading the preview', async ({
  page,
}) => {
  await installFakePresentationHost(page);

  const frame = await getPreviewFrame(page);
  const title = frame.getByTestId('presentation-smoke-title');

  await expect(title).toContainText(liveTitle);

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

  await expect(title).toContainText(liveTitle);
  await expectEditableTitleMarker(title);

  await waitForMessage(
    page,
    (message) =>
      message.type === 'handshake/syn-ack' &&
      (message.from === 'visual-editing' || message.from === 'overlays'),
  );
});

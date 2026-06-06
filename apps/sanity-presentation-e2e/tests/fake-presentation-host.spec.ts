import { expect, test, type Page } from '@playwright/test';

const previewURL =
  process.env['SANITY_E2E_PREVIEW_URL'] ?? 'http://localhost:4200';

type ProtocolMessage = {
  connectionId?: string;
  data?: unknown;
  domain?: string;
  from?: string;
  id?: string;
  to?: string;
  type?: string;
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

test('Angular preview announces live documents when embedded by Presentation', async ({
  page,
}) => {
  await installFakePresentationHost(page);

  const frame = page.frameLocator('#preview');
  await expect(frame.getByTestId('presentation-smoke-kicker')).toBeVisible();

  await expect
    .poll(async () =>
      page.evaluate(() =>
        (
          window as unknown as {
            __presentationMessages: ProtocolMessage[];
          }
        ).__presentationMessages.some(
          (message) => message.type === 'preview-kit/documents',
        ),
      ),
      { timeout: 30_000 },
    )
    .toBe(true);

  await expect(frame.getByTestId('presentation-smoke-title')).toContainText(
    'Live presentation smoke title',
  );

  const documentsMessage = await page.evaluate(() =>
    (
      window as unknown as {
        __presentationMessages: ProtocolMessage[];
      }
    ).__presentationMessages.find(
      (message) => message.type === 'preview-kit/documents',
    ),
  );

  expect(documentsMessage).toMatchObject({
    from: 'preview-kit',
    to: 'presentation',
    type: 'preview-kit/documents',
  });
  expect(documentsMessage?.data).toMatchObject({
    dataset: 'presentation-smoke-dataset',
    documents: [{ _id: 'presentation-smoke-post' }],
    perspective: 'previewDrafts',
    projectId: 'presentation-smoke-project',
  });
});

test('visual editing connects to the Presentation host', async ({ page }) => {
  await installFakePresentationHost(page);

  await expect
    .poll(async () =>
      page.evaluate(() =>
        (
          window as unknown as {
            __presentationMessages: ProtocolMessage[];
          }
        ).__presentationMessages.some(
          (message) =>
            message.type === 'handshake/syn-ack' &&
            (message.from === 'visual-editing' || message.from === 'overlays'),
        ),
      ),
    )
    .toBe(true);
});

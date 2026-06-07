import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine, isMainModule } from '@angular/ssr/node';
import { render } from '@netlify/angular-runtime/common-engine.js';
import express, {
  type Request as ExpressRequest,
  type Response as ExpressResponse,
} from 'express';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import bootstrap from './main.server';
import { REQUEST, RESPONSE } from './server.tokens';

const netlifyCommonEngine = new CommonEngine();

export async function netlifyCommonEngineHandler(): Promise<globalThis.Response> {
  return await render(netlifyCommonEngine);
}

export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');
  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  server.get(
    '*.*',
    express.static(browserDistFolder, {
      maxAge: '1y',
    }),
  );

  server.get('**', (req: ExpressRequest, res: ExpressResponse, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [
          { provide: APP_BASE_HREF, useValue: baseUrl },
          { provide: REQUEST, useValue: req },
          { provide: RESPONSE, useValue: res },
        ],
      })
      .then((html) => res.send(html))
      .catch((error: unknown) => next(error));
  });

  return server;
}

if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;

  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine, isMainModule } from '@angular/ssr/node';
import { createClient } from '@sanity/client';
import express from 'express';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createDefaultPresentationSmokeDocument,
  presentationSmokeApiVersion,
  presentationSmokeDocumentId,
  type PresentationSmokeConfig,
  type PresentationSmokeDocument,
} from './app/presentation-smoke/presentation-smoke-config';
import bootstrap from './main.server';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = join(serverDistFolder, 'index.server.html');

const app = express();
const commonEngine = new CommonEngine({
  allowedHosts: ['localhost', '127.0.0.1', '::1'],
});

app.get('/api/presentation-smoke-health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/presentation-smoke-config.js', async (_req, res, next) => {
  try {
    const config = await getPresentationSmokeConfig();
    res.type('application/javascript');
    res.send(`window.__presentationSmokeConfig=${serializeForScript(config)};`);
  } catch (error) {
    next(error);
  }
});

app.get('/api/draft', (req, res) => {
  const redirectTo = getSafeRedirect(req.query['redirect']);
  setDraftCookie(res);
  res.redirect(307, redirectTo);
});

app.get('/api/draft/disable', (_req, res) => {
  clearDraftCookie(res);
  res.redirect(307, '/presentation-smoke');
});

/**
 * Serve static files from /browser
 */
app.get(
  '**',
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: 'index.html',
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.get('**', (req, res, next) => {
  const { protocol, originalUrl, baseUrl, headers } = req;

  commonEngine
    .render({
      bootstrap,
      documentFilePath: indexHtml,
      url: `${protocol}://${headers.host}${originalUrl}`,
      publicPath: browserDistFolder,
      providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
    })
    .then((html) => res.send(html))
    .catch((err) => next(err));
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

async function getPresentationSmokeConfig(): Promise<PresentationSmokeConfig> {
  const mode =
    process.env['SANITY_PRESENTATION_E2E_REAL_CLIENT'] === '1'
      ? 'real-client'
      : 'fake-client';
  const projectId =
    process.env['VITE_SANITY_PROJECT_ID'] ?? 'presentation-smoke-project';
  const dataset =
    process.env['VITE_SANITY_DATASET'] ?? 'presentation-smoke-dataset';
  const apiVersion =
    process.env['VITE_SANITY_API_VERSION'] ?? presentationSmokeApiVersion;
  const studioUrl =
    process.env['VITE_SANITY_STUDIO_URL'] ?? 'http://localhost:3333';
  const token =
    mode === 'real-client'
      ? requiredEnv('SANITY_API_READ_TOKEN')
      : 'presentation-smoke-token';

  return {
    apiVersion,
    dataset,
    document:
      mode === 'real-client'
        ? await fetchPresentationSmokeDocument({
            apiVersion,
            dataset,
            projectId,
            token,
          })
        : createDefaultPresentationSmokeDocument(),
    mode,
    projectId,
    studioUrl,
    token,
  };
}

async function fetchPresentationSmokeDocument(config: {
  apiVersion: string;
  dataset: string;
  projectId: string;
  token: string;
}): Promise<PresentationSmokeDocument> {
  const client = createClient({
    ...config,
    perspective: 'drafts',
    useCdn: false,
  });
  const document = await client.fetch<PresentationSmokeDocument | null>(
    '*[_id == $id][0]{_id,_type,"title": coalesce(title, "Untitled")}',
    { id: presentationSmokeDocumentId },
  );

  if (!document?._id) {
    throw new Error(
      'Real Presentation smoke needs a Sanity post document with _id "presentation-smoke-post". Run `node apps/sanity-presentation-e2e/scripts/sanity-seed-post.mjs`.',
    );
  }

  return document;
}

function getSafeRedirect(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/')
    ? value
    : '/presentation-smoke';
}

function setDraftCookie(res: express.Response): void {
  const token = process.env['BYPASS_TOKEN'];

  if (!token) {
    return;
  }

  res.cookie('__prerender_bypass', token, {
    httpOnly: true,
    maxAge: 60 * 60 * 1000,
    path: '/',
    sameSite: process.env['NODE_ENV'] === 'production' ? 'none' : 'lax',
    secure: process.env['NODE_ENV'] === 'production',
  });
}

function clearDraftCookie(res: express.Response): void {
  res.clearCookie('__prerender_bypass', { path: '/' });
}

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}.`);
  }

  return value;
}

function serializeForScript(value: unknown): string {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}

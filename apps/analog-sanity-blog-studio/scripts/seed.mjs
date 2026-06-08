import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@sanity/client';

import {
  loadBlogStudioEnv,
  requireBlogStudioEnv,
  studioRoot,
} from './env.mjs';

const env = loadBlogStudioEnv();

requireBlogStudioEnv(env, [
  'SANITY_STUDIO_PROJECT_ID',
  'SANITY_STUDIO_DATASET',
]);

const documents = [
  {
    _id: 'settings',
    _type: 'settings',
    title: 'Blog.',
    description: simpleBlock(
      'A statically generated blog example using Analog, Sanity and Limitless Angular.',
    ),
    footer: blockContent(
      'Built with Analog, Sanity and Limitless Angular.',
    ),
  },
  {
    _id: 'author.limitless',
    _type: 'author',
    name: 'Limitless Angular',
  },
  {
    _id: 'post.hello-analog-sanity',
    _type: 'post',
    title: 'A native authoring workflow for Analog and Sanity',
    slug: { _type: 'slug', current: 'hello-analog-sanity' },
    excerpt:
      'Run an Analog blog as the live preview target inside Sanity Studio Presentation.',
    date: '2026-01-01T12:00:00.000Z',
    author: { _type: 'reference', _ref: 'author.limitless' },
    content: blockContent(
      'Sanity Presentation gives editors a Studio-native way to author Angular content without embedding the Studio inside the Angular runtime.',
      'The frontend remains a regular Analog app, while the Studio owns schemas, document routing and authoring tools.',
    ),
  },
  {
    _id: 'post.live-preview-angular',
    _type: 'post',
    title: 'Live preview belongs at the content boundary',
    slug: { _type: 'slug', current: 'live-preview-angular' },
    excerpt:
      'A small shared package keeps schemas, queries and Presentation routing aligned.',
    date: '2026-01-02T12:00:00.000Z',
    author: { _type: 'reference', _ref: 'author.limitless' },
    content: blockContent(
      'The shared package is source-only, so the example stays easy to inspect and does not create another build artifact.',
      'Both Studio and Analog import the same content contract through explicit package exports.',
    ),
  },
];

if (env.SANITY_API_WRITE_TOKEN) {
  await seedWithWriteToken();
} else {
  seedWithSanityCli();
}

console.log(
  `Analog blog seed content is available in dataset ${env.SANITY_STUDIO_DATASET}.`,
);

async function seedWithWriteToken() {
  const client = createClient({
    projectId: env.SANITY_STUDIO_PROJECT_ID,
    dataset: env.SANITY_STUDIO_DATASET,
    apiVersion: env.VITE_SANITY_API_VERSION ?? '2024-02-28',
    token: env.SANITY_API_WRITE_TOKEN,
    useCdn: false,
  });

  for (const document of documents) {
    await client.createIfNotExists(document);
  }
}

function seedWithSanityCli() {
  const tempDir = mkdtempSync(join(tmpdir(), 'analog-sanity-blog-seed-'));

  try {
    for (const document of documents) {
      const documentPath = join(tempDir, `${document._id}.json`);
      writeFileSync(documentPath, JSON.stringify(document, null, 2));

      const result = spawnSync(
        'pnpm',
        [
          'exec',
          'sanity',
          'documents',
          'create',
          documentPath,
          '--missing',
          '--dataset',
          env.SANITY_STUDIO_DATASET,
        ],
        {
          cwd: studioRoot,
          encoding: 'utf8',
          env,
        },
      );

      if (result.stdout) {
        process.stdout.write(result.stdout);
      }

      if (result.stderr) {
        process.stderr.write(result.stderr);
      }

      if (result.error) {
        console.error(result.error.message);
      }

      if (result.status !== 0) {
        console.error(
          'Unable to seed the Analog blog content. Run `pnpm --filter=analog-sanity-blog-studio exec sanity login` or set SANITY_API_WRITE_TOKEN.',
        );
        process.exit(result.status ?? 1);
      }
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function blockContent(...paragraphs) {
  return paragraphs.map((text, index) => ({
    _key: `seedBlock${index}`,
    _type: 'block',
    children: [
      {
        _key: `seedSpan${index}`,
        _type: 'span',
        marks: [],
        text,
      },
    ],
    markDefs: [],
    style: 'normal',
  }));
}

function simpleBlock(text) {
  return blockContent(text);
}

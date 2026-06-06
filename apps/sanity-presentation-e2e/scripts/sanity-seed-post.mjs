import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createClient } from '@sanity/client';

const workspaceRoot = resolve(import.meta.dirname, '../../..');
const document = {
  _id: 'presentation-smoke-post',
  _type: 'post',
  title: 'Presentation smoke title',
};

const fileEnv = loadEnvFiles([
  resolve(workspaceRoot, 'apps/analog-sanity-blog-example/.env.local'),
  resolve(workspaceRoot, 'apps/sanity-presentation-e2e/.env.local'),
]);
const env = {
  ...fileEnv,
  ...process.env,
};

env.SANITY_STUDIO_PROJECT_ID ??= env.VITE_SANITY_PROJECT_ID;
env.SANITY_STUDIO_DATASET ??= env.VITE_SANITY_DATASET;

for (const name of ['SANITY_STUDIO_PROJECT_ID', 'SANITY_STUDIO_DATASET']) {
  if (!env[name]) {
    console.error(
      `Missing ${name}. Set it or the matching VITE_SANITY_* value in .env.local.`,
    );
    process.exit(1);
  }
}

if (env.SANITY_API_WRITE_TOKEN) {
  await createWithWriteToken();
} else {
  createWithSanityCli();
}

console.log(
  `Real Sanity document ${document._id} is available in dataset ${env.SANITY_STUDIO_DATASET}.`,
);

async function createWithWriteToken() {
  const client = createClient({
    projectId: env.SANITY_STUDIO_PROJECT_ID,
    dataset: env.SANITY_STUDIO_DATASET,
    apiVersion: env.VITE_SANITY_API_VERSION ?? '2024-02-28',
    token: env.SANITY_API_WRITE_TOKEN,
    useCdn: false,
  });

  await client.createIfNotExists(document);
}

function createWithSanityCli() {
  const tempDir = mkdtempSync(join(tmpdir(), 'sanity-presentation-e2e-'));
  const documentPath = join(tempDir, 'presentation-smoke-post.json');

  writeFileSync(documentPath, JSON.stringify(document, null, 2));

  try {
    const result = spawnSync(
      'pnpm',
      [
        '--dir=apps/sanity-presentation-e2e-studio',
        'sanity',
        'documents',
        'create',
        documentPath,
        '--missing',
        '--dataset',
        env.SANITY_STUDIO_DATASET,
      ],
      {
        cwd: workspaceRoot,
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
        'Unable to seed the real Sanity document. Run `pnpm --dir=apps/sanity-presentation-e2e-studio sanity login` or set SANITY_API_WRITE_TOKEN.',
      );
      process.exit(result.status ?? 1);
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function loadEnvFiles(paths) {
  return paths.reduce((acc, path) => {
    if (!existsSync(path)) {
      return acc;
    }

    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([\w.-]+)\s*=\s*(.*)?\s*$/);

      if (!match) {
        continue;
      }

      const [, key, rawValue = ''] = match;

      if (!key || key.startsWith('#')) {
        continue;
      }

      acc[key] = parseEnvValue(rawValue);
    }

    return acc;
  }, {});
}

function parseEnvValue(rawValue) {
  const value = rawValue.trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value.replace(/\s+#.*$/, '');
}

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { createClient } from '@sanity/client';

const workspaceRoot = resolve(import.meta.dirname, '../../..');
const envFile = resolve(
  workspaceRoot,
  'apps/sanity-presentation-e2e/.env.local',
);
const document = {
  _id: 'presentation-smoke-post',
  _type: 'post',
  title: 'Presentation smoke title',
};

if (existsSync(envFile)) {
  loadEnvFile(envFile);
}

const projectId = requiredEnv('SANITY_E2E_PROJECT_ID');
const dataset = requiredEnv('SANITY_E2E_DATASET');
const apiVersion = process.env.SANITY_E2E_API_VERSION || '2024-02-28';
const writeToken = process.env.SANITY_E2E_WRITE_TOKEN;
const env = {
  ...process.env,
  SANITY_STUDIO_PROJECT_ID: projectId,
  SANITY_STUDIO_DATASET: dataset,
};

if (writeToken) {
  await createWithWriteToken();
} else {
  createWithSanityCli();
}

console.log(
  `Real Sanity document ${document._id} is available in dataset ${dataset}.`,
);

async function createWithWriteToken() {
  const client = createClient({
    projectId,
    dataset,
    apiVersion,
    token: writeToken,
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
        dataset,
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
        'Unable to seed the real Sanity document. Run `pnpm --dir=apps/sanity-presentation-e2e-studio sanity login` or set SANITY_E2E_WRITE_TOKEN.',
      );
      process.exit(result.status ?? 1);
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    console.error(
      `Missing ${name}. Set it in the shell, CI env, or apps/sanity-presentation-e2e/.env.local.`,
    );
    process.exit(1);
  }

  return value;
}

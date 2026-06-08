import { spawnSync } from 'node:child_process';

import { loadBlogStudioEnv, requireBlogStudioEnv, studioRoot } from './env.mjs';

const [command, explicitOrigin] = process.argv.slice(2);

if (command !== 'add' && command !== 'list') {
  console.error('Usage: node scripts/sanity-cors.mjs <add|list> [origin]');
  process.exit(1);
}

const env = loadBlogStudioEnv();

requireBlogStudioEnv(env, [
  'SANITY_STUDIO_PROJECT_ID',
  'SANITY_STUDIO_DATASET',
]);

if (command === 'list') {
  process.exit(runSanity(['cors', 'list'], env));
}

const origins = explicitOrigin
  ? [explicitOrigin]
  : uniqueOrigins([env.SANITY_STUDIO_ORIGIN, env.SANITY_STUDIO_PREVIEW_ORIGIN]);

for (const origin of origins) {
  const status = runSanity(['cors', 'add', origin, '--credentials'], env, {
    tolerateDuplicate: true,
  });

  if (status !== 0) {
    process.exit(status);
  }
}

function runSanity(args, env, options = {}) {
  const result = spawnSync('pnpm', ['exec', 'sanity', ...args], {
    cwd: studioRoot,
    encoding: 'utf8',
    env,
  });

  if (
    options.tolerateDuplicate &&
    result.status !== 0 &&
    didReportDuplicateOrigin(result)
  ) {
    const origin = args[2];
    console.log(
      `CORS origin ${origin} is already configured for project ${env.SANITY_STUDIO_PROJECT_ID}.`,
    );
    return 0;
  }

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.error) {
    console.error(result.error.message);
  }

  return result.status ?? 1;
}

function uniqueOrigins(origins) {
  return [...new Set(origins.filter(Boolean))];
}

function didReportDuplicateOrigin(result) {
  return `${result.stdout ?? ''}${result.stderr ?? ''}`.includes(
    'Duplicate origin already exists for this project',
  );
}

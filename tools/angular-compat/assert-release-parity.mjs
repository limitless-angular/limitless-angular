import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { workspaceRoot } from './lib.mjs';
import { compatibilityValidationSteps } from '../release/src/pipeline.mjs';

const requiredCompatibilitySteps = [
  'pnpm turbo run compat:pack --filter=@limitless-angular/angular-compat',
  'pnpm turbo run compat:artifact --filter=@limitless-angular/angular-compat',
  'pnpm --dir tools/angular-compat exec playwright install --with-deps chromium',
  'pnpm turbo run compat:test --filter=@limitless-angular/angular-compat',
];

export function assertReleaseParity() {
  const publishWorkflow = readFileSync(
    join(workspaceRoot, '.github/workflows/release-and-publish.yml'),
    'utf8',
  );
  const dryRunWorkflow = readFileSync(
    join(workspaceRoot, '.github/workflows/release-dry-run.yml'),
    'utf8',
  );
  const actualCompatibilitySteps = compatibilityValidationSteps.map(
    ({ args, command }) => [command, ...args].join(' '),
  );

  assertIncludes(publishWorkflow, [
    'pnpm turbo run release:publish --filter=@limitless-angular/release-tools',
  ]);
  assertIncludes(dryRunWorkflow, [
    'pnpm turbo run release:dry-run --filter=@limitless-angular/release-tools',
  ]);
  assertIncludes(
    actualCompatibilitySteps.join('\n'),
    requiredCompatibilitySteps,
  );

  console.log(
    'Release workflows delegate to release tools and validate the compatibility artifact.',
  );
}

function assertIncludes(text, snippets) {
  for (const snippet of snippets) {
    if (!text.includes(snippet)) {
      throw new Error(
        `Release workflow must use the compatibility pipeline command: ${snippet}`,
      );
    }
  }
}

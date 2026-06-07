import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { workspaceRoot } from './lib.mjs';

const requiredReleaseCommands = [
  'pnpm run compat:pack',
  'pnpm run compat:artifact',
  'pnpm run compat:test',
  'npm publish "$TARBALL"',
];

export function assertReleaseParity() {
  const workflow = readFileSync(
    join(workspaceRoot, '.github/workflows/release-and-publish.yml'),
    'utf8',
  );

  for (const command of requiredReleaseCommands) {
    if (!workflow.includes(command)) {
      throw new Error(
        `Release workflow must use the compatibility pipeline command: ${command}`,
      );
    }
  }

  console.log('Release workflow publishes the compatibility-tested tarball.');
}

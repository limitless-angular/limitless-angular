import assert from 'node:assert/strict';
import { test } from 'node:test';

import { capture } from './commands.mjs';

test('capture preserves stderr and exit status when requested for error classification', () => {
  assert.throws(
    () =>
      capture(
        process.execPath,
        ['-e', "process.stderr.write('release not found\\n'); process.exit(1)"],
        {
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      ),
    (error) => error.status === 1 && error.stderr === 'release not found\n',
  );
});

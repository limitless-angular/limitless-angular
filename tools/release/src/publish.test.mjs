import assert from 'node:assert/strict';
import { test } from 'node:test';

import { publishTarball } from './publish.mjs';

test('publish retries npm verification until the version and dist-tag are visible', () => {
  const plan = createPlan();
  const state = {
    distTags: { latest: '1.0.0' },
    published: false,
    versionReads: 0,
    versions: ['1.0.0'],
  };
  const commands = [];

  const published = publishTarball(plan, '/tmp/release.tgz', {
    capture(command, args) {
      if (command === 'npm' && args[0] === 'view' && args[2] === 'versions') {
        state.versionReads += 1;

        if (state.published && state.versionReads >= 3) {
          state.versions = ['1.0.0', '1.0.1'];
        }

        return JSON.stringify(state.versions);
      }

      if (command === 'npm' && args[0] === 'view' && args[2] === 'dist-tags') {
        return JSON.stringify(state.distTags);
      }

      throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
    },
    npmPublishVerificationRetry: {
      attempts: 3,
      delayMs: 0,
    },
    run(command, args) {
      commands.push([command, ...args].join(' '));

      if (command === 'npm' && args[0] === 'publish') {
        state.published = true;
        state.distTags.latest = '1.0.1';
      }
    },
  });

  assert.equal(published, true);
  assert.equal(state.versionReads, 3);
  assert.deepEqual(commands, [
    'npm publish /tmp/release.tgz --access public --registry https://registry.npmjs.org',
  ]);
});

test('publish retries npm verification until the dist-tag points to the version', () => {
  const plan = createPlan();
  const state = {
    distTagReads: 0,
    distTags: { latest: '1.0.0' },
    versions: ['1.0.0'],
  };

  publishTarball(plan, '/tmp/release.tgz', {
    capture(command, args) {
      if (command === 'npm' && args[0] === 'view' && args[2] === 'versions') {
        return JSON.stringify(state.versions);
      }

      if (command === 'npm' && args[0] === 'view' && args[2] === 'dist-tags') {
        state.distTagReads += 1;

        if (state.distTagReads >= 2) {
          state.distTags.latest = '1.0.1';
        }

        return JSON.stringify(state.distTags);
      }

      throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
    },
    npmPublishVerificationRetry: {
      attempts: 2,
      delayMs: 0,
    },
    run(command, args) {
      if (command === 'npm' && args[0] === 'publish') {
        state.versions.push('1.0.1');
      }
    },
  });

  assert.equal(state.distTagReads, 2);
});

function createPlan() {
  return {
    nextVersion: '1.0.1',
    npmDistTag: 'latest',
    packageName: '@limitless-angular/sanity',
  };
}

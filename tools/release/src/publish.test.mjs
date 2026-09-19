import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createGitHubRelease, publishTarball } from './publish.mjs';

test('GitHub release creation proceeds only for a confirmed missing release', () => {
  let created = false;
  const plan = {
    releaseTag: 'sanity@1.0.1',
    prerelease: false,
    releaseNotes: 'Notes',
  };
  assert.equal(
    createGitHubRelease(plan, {
      env: { GITHUB_TOKEN: 'test-token' },
      capture(_command, _args, options) {
        assert.deepEqual(options.stdio, ['ignore', 'pipe', 'pipe']);
        if (!created) {
          throw Object.assign(new Error('release not found'), {
            status: 1,
            stderr: Buffer.from('release not found\n'),
          });
        }
        return JSON.stringify({
          tagName: plan.releaseTag,
          isPrerelease: false,
          isDraft: false,
        });
      },
      run(command, args) {
        assert.equal(command, 'gh');
        assert.deepEqual(args.slice(0, 3), [
          'release',
          'create',
          plan.releaseTag,
        ]);
        created = true;
      },
    }),
    true,
  );
  assert.equal(created, true);
});

for (const output of ['', 'not json']) {
  test(`GitHub release lookup rejects malformed output ${JSON.stringify(output)}`, () => {
    assert.throws(
      () =>
        createGitHubRelease(
          { releaseTag: 'sanity@1.0.1' },
          {
            env: { GITHUB_TOKEN: 'test-token' },
            capture() {
              return output;
            },
            run() {
              assert.fail('Must not create a release after malformed output');
            },
          },
        ),
      SyntaxError,
    );
  });
}

for (const failure of [
  Object.assign(new Error('spawnSync gh ENOENT'), { code: 'ENOENT' }),
  Object.assign(new Error('unauthorized'), {
    status: 1,
    stderr: 'HTTP 401: Bad credentials',
  }),
  Object.assign(new Error('network'), {
    status: 1,
    stderr: 'connection refused',
  }),
  Object.assign(new Error('forbidden'), {
    status: 1,
    stderr: 'HTTP 403: Forbidden',
  }),
]) {
  test(`GitHub release lookup propagates ${failure.message}`, () => {
    assert.throws(
      () =>
        createGitHubRelease(
          { releaseTag: 'sanity@1.0.1' },
          {
            env: { GITHUB_TOKEN: 'test-token' },
            capture() {
              throw failure;
            },
            run() {
              assert.fail('Must not create a release after a failed lookup');
            },
          },
        ),
      (error) => error === failure,
    );
  });
}

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

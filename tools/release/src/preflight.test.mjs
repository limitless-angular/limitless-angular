import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertFinalPublishPreconditions,
  assertPublishPreconditions,
} from './preflight.mjs';

const plan = {
  nextVersion: '1.1.0',
  packageName: '@limitless-angular/sanity',
  packageRepositoryUrl:
    'https://github.com/limitless-angular/limitless-angular',
  releaseTag: 'sanity@1.1.0',
};

const trustedPublishingEnv = {
  ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'github-oidc-token',
  ACTIONS_ID_TOKEN_REQUEST_URL: 'https://actions.example/id-token',
  GITHUB_REF: 'refs/heads/main',
  GITHUB_TOKEN: 'token',
};

test('publish preflight rejects non-main GitHub refs', () => {
  assert.throws(
    () =>
      assertPublishPreconditions(plan, {
        capture: createCapture(),
        env: {
          ...trustedPublishingEnv,
          GITHUB_REF: 'refs/heads/release-test',
        },
        run: recordRun(),
      }),
    /expected refs\/heads\/main/,
  );
});

test('publish preflight rejects missing GitHub release tokens', () => {
  assert.throws(
    () =>
      assertPublishPreconditions(plan, {
        capture: createCapture(),
        env: { ...trustedPublishingEnv, GITHUB_TOKEN: '' },
        run: recordRun(),
      }),
    /without GITHUB_TOKEN/,
  );
});

test('publish preflight rejects missing GitHub Actions OIDC request variables', () => {
  assert.throws(
    () =>
      assertPublishPreconditions(plan, {
        capture: createCapture(),
        env: {
          ...trustedPublishingEnv,
          ACTIONS_ID_TOKEN_REQUEST_TOKEN: '',
        },
        run: recordRun(),
      }),
    /without GitHub Actions OIDC request environment variables/,
  );
});

test('publish preflight rejects dirty worktrees', () => {
  assert.throws(
    () =>
      assertPublishPreconditions(plan, {
        capture: createCapture({ status: ' M packages/sanity/package.json\n' }),
        env: trustedPublishingEnv,
        run: recordRun(),
      }),
    /uncommitted workspace changes/,
  );
});

test('publish preflight rejects repository URLs that cannot satisfy npm trust', () => {
  assert.throws(
    () =>
      assertPublishPreconditions(
        {
          ...plan,
          packageRepositoryUrl:
            'git+https://github.com/limitless-angular/limitless-angular.git',
        },
        {
          capture: createCapture(),
          env: trustedPublishingEnv,
          run: recordRun(),
        },
      ),
    /repository\.url .* must exactly match .* npm trusted publishing/,
  );
});

test('publish preflight rejects already-published npm versions', () => {
  assert.throws(
    () =>
      assertPublishPreconditions(plan, {
        capture: createCapture({ npmVersions: ['1.0.0', '1.1.0'] }),
        env: trustedPublishingEnv,
        run: recordRun(),
      }),
    /already exists on npm/,
  );
});

test('final publish preflight rejects a moved release branch', () => {
  assert.throws(
    () =>
      assertFinalPublishPreconditions(plan, {
        capture: createCapture({
          mergeBase: 'old-main-sha',
          remoteHead: 'new-main-sha',
        }),
        env: trustedPublishingEnv,
        run: recordRun(),
      }),
    /origin\/main moved after validation/,
  );
});

function createCapture({
  head = 'main-sha',
  mergeBase = 'main-sha',
  npmVersions = ['1.0.0'],
  remoteHead = 'main-sha',
  status = '',
} = {}) {
  return (command, args) => {
    if (command === 'git' && args[0] === 'status') {
      return status;
    }

    if (command === 'git' && args[0] === 'branch') {
      return 'main';
    }

    if (command === 'git' && args[0] === 'rev-parse' && args[1] === 'HEAD') {
      return head;
    }

    if (
      command === 'git' &&
      args[0] === 'rev-parse' &&
      args[1] === 'origin/main'
    ) {
      return remoteHead;
    }

    if (
      command === 'git' &&
      args[0] === 'rev-parse' &&
      args[1] === '--verify'
    ) {
      throw new Error(`Missing local tag ${args[2]}`);
    }

    if (command === 'git' && args[0] === 'merge-base') {
      return mergeBase;
    }

    if (command === 'git' && args[0] === 'ls-remote') {
      throw new Error(`Missing remote tag ${args.at(-1)}`);
    }

    if (command === 'npm' && args[0] === 'view') {
      return JSON.stringify(npmVersions);
    }

    throw new Error(`Unexpected command: ${command} ${args.join(' ')}`);
  };
}

function recordRun() {
  return () => {};
}

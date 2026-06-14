import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  isAngularFrameworkPackage,
  preparePublishablePackage,
  resolveAngularPackageVersion,
  resolveAngularToolchain,
} from './lib.mjs';

test('Angular framework packages reuse the exact resolved framework version', () => {
  const { resolveNpmJson } = createNpmJsonResolver();

  assert.equal(isAngularFrameworkPackage('@angular/compiler-cli'), true);
  assert.equal(
    resolveAngularPackageVersion(
      '@angular/compiler-cli',
      { id: 'angular-next', mode: 'dist-tag', npmTag: 'next' },
      '22.1.0-next.0',
      { resolveNpmJson },
    ),
    '22.1.0-next.0',
  );
});

test('Angular CLI-owned packages resolve from their own dist-tag', () => {
  const { calls, resolveNpmJson } = createNpmJsonResolver({
    '@angular/build@next version': '22.0.0',
  });

  assert.equal(isAngularFrameworkPackage('@angular/build'), false);
  assert.equal(
    resolveAngularPackageVersion(
      '@angular/build',
      { id: 'angular-next', mode: 'dist-tag', npmTag: 'next' },
      '22.1.0-next.0',
      { resolveNpmJson },
    ),
    '22.0.0',
  );
  assert.deepEqual(calls, [{ field: 'version', spec: '@angular/build@next' }]);
});

test('canary toolchain allows framework and CLI next tags to move independently', () => {
  const { calls, resolveNpmJson } = createNpmJsonResolver({
    '@angular/core@next version': '22.1.0-next.0',
    '@angular/compiler-cli@22.1.0-next.0 peerDependencies': {
      typescript: '>=6.0 <6.2',
    },
    '@angular/build@next version': '22.0.0',
    '@angular/build@22.0.0 peerDependencies': {
      typescript: '>=6.0 <6.1',
    },
    '@angular/cli@next version': '22.0.0',
    'typescript versions': ['6.0.0', '6.0.1', '6.1.0'],
  });

  const toolchain = resolveAngularToolchain(
    { id: 'angular-next', mode: 'dist-tag', npmTag: 'next' },
    { includeCli: true, resolveNpmJson },
  );

  assert.equal(toolchain.angularVersion, '22.1.0-next.0');
  assert.equal(toolchain.compilerCliVersion, '22.1.0-next.0');
  assert.equal(toolchain.angularBuildVersion, '22.0.0');
  assert.equal(toolchain.cliVersion, '22.0.0');
  assert.equal(toolchain.typescriptVersion, '6.0.1');
  assert.equal(
    calls.some(({ spec }) => spec === '@angular/build@22.1.0-next.0'),
    false,
  );
});

test('publishable package preparation removes source-only private metadata', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'limitless-publishable-'));

  try {
    writeFileSync(
      join(workspace, 'package.json'),
      `${JSON.stringify(
        {
          name: '@limitless-angular/sanity',
          private: true,
          version: '0.0.0-development',
        },
        null,
        2,
      )}\n`,
    );

    const packageJson = preparePublishablePackage(workspace, {
      version: '20.0.0-next.1',
    });
    const writtenPackageJson = JSON.parse(
      readFileSync(join(workspace, 'package.json'), 'utf8'),
    );

    assert.equal(packageJson.private, undefined);
    assert.equal(packageJson.version, '20.0.0-next.1');
    assert.deepEqual(writtenPackageJson, packageJson);
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

test('publishable package preparation rejects invalid release versions', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'limitless-publishable-'));

  try {
    writeFileSync(
      join(workspace, 'package.json'),
      `${JSON.stringify(
        {
          name: '@limitless-angular/sanity',
          private: true,
          version: '0.0.0-development',
        },
        null,
        2,
      )}\n`,
    );

    assert.throws(
      () => preparePublishablePackage(workspace, { version: 'next' }),
      /valid semver/,
    );
  } finally {
    rmSync(workspace, { force: true, recursive: true });
  }
});

function createNpmJsonResolver(entries = {}) {
  const calls = [];

  return {
    calls,
    resolveNpmJson(spec, field) {
      calls.push({ field, spec });
      const key = `${spec} ${field}`;
      if (!Object.hasOwn(entries, key)) {
        throw new Error(`Unexpected npm metadata request: ${key}`);
      }

      return entries[key];
    },
  };
}

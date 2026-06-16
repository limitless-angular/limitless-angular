import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readJson } from './lib.mjs';

const sanityPackageJson = readJson(
  new URL('../../packages/sanity/package.json', import.meta.url),
);
const sanityNgPackageJson = readJson(
  new URL('../../packages/sanity/ng-package.json', import.meta.url),
);

const peerOwnedDependencies = [
  '@angular/common',
  '@angular/core',
  '@angular/router',
  '@sanity/client',
  'rxjs',
];
const bundledFeatureDependencies = [
  '@portabletext/toolkit',
  '@portabletext/types',
  '@sanity/image-url',
];
const supportedSanityDependencyRanges = {
  peerDependencies: {
    '@sanity/client': '^7.0.0',
  },
  dependencies: {
    '@portabletext/toolkit': '^5.0.0',
    '@portabletext/types': '^4.0.0',
    '@sanity/image-url': '^2.0.2',
  },
};

test('@limitless-angular/sanity keeps framework and client packages peer-owned', () => {
  const dependencies = dependencyNames('dependencies');
  const peerDependencies = dependencyNames('peerDependencies');

  for (const dependency of peerOwnedDependencies) {
    assert.ok(
      peerDependencies.has(dependency),
      `${dependency} should be a peer dependency`,
    );
    assert.ok(
      !dependencies.has(dependency),
      `${dependency} should not be bundled as a runtime dependency`,
    );
  }

  assert.deepEqual(sanityPackageJson.peerDependenciesMeta ?? {}, {
    '@angular/router': { optional: true },
  });
});

test('@limitless-angular/sanity bundles feature implementation helpers', () => {
  const dependencies = dependencyNames('dependencies');
  const peerDependencies = dependencyNames('peerDependencies');
  const devDependencies = dependencyNames('devDependencies');
  const allowedNonPeerDependencies = new Set(
    sanityNgPackageJson.allowedNonPeerDependencies ?? [],
  );

  for (const dependency of bundledFeatureDependencies) {
    assert.ok(
      dependencies.has(dependency),
      `${dependency} should be a runtime dependency`,
    );
    assert.ok(
      !peerDependencies.has(dependency),
      `${dependency} should not be a peer dependency`,
    );
    assert.ok(
      !devDependencies.has(dependency),
      `${dependency} should not be duplicated in devDependencies`,
    );
    assert.ok(
      allowedNonPeerDependencies.has(dependency),
      `${dependency} should be allowed by ng-packagr as a non-peer dependency`,
    );
  }
});

test('@limitless-angular/sanity avoids dependency bucket duplication', () => {
  const dependencies = dependencyNames('dependencies');
  const peerDependencies = dependencyNames('peerDependencies');
  const devDependencies = dependencyNames('devDependencies');

  for (const dependency of dependencies) {
    assert.ok(
      !devDependencies.has(dependency),
      `${dependency} should not be duplicated in devDependencies`,
    );
  }

  for (const dependency of peerDependencies) {
    assert.ok(
      !dependencies.has(dependency),
      `${dependency} should not be both a dependency and peerDependency`,
    );
  }
});

test('@limitless-angular/sanity only supports current Sanity dependency majors', () => {
  for (const [section, ranges] of Object.entries(
    supportedSanityDependencyRanges,
  )) {
    for (const [dependency, range] of Object.entries(ranges)) {
      assert.equal(sanityPackageJson[section]?.[dependency], range);
    }
  }
});

function dependencyNames(section) {
  return new Set(Object.keys(sanityPackageJson[section] ?? {}));
}

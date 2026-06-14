import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const releasePackageRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
);
export const workspaceRoot = resolve(releasePackageRoot, '../..');
export const packageRoot = resolve(workspaceRoot, 'packages/sanity');
export const packageJsonPath = resolve(packageRoot, 'package.json');
export const artifactDir = resolve(workspaceRoot, '.compat/artifacts');
export const initialReleaseVersion = '0.0.0';
export const plannedPackageVersionEnv = 'LIMITLESS_RELEASE_VERSION';
export const releaseTagPrefix = 'sanity@';
export const repoUrl = 'https://github.com/limitless-angular/limitless-angular';

export const releasePackages = [
  {
    name: '@limitless-angular/sanity',
    ignoredReleaseScopes: ['release'],
    ignoredReleaseScopeJsonFields: {
      'packages/sanity/package.json': ['private', 'version'],
    },
    ignoredReleaseScopePaths: ['packages/sanity/CHANGELOG.md'],
    packageJsonPath,
    releasePaths: ['packages/sanity/**'],
    releaseScopes: ['sanity'],
    releaseTagPrefix,
    root: 'packages/sanity',
  },
];
export const defaultReleasePackage = releasePackages[0];

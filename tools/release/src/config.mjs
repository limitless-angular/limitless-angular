import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const releasePackageRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
);
export const workspaceRoot = resolve(releasePackageRoot, '../..');
export const packageRoot = resolve(workspaceRoot, 'packages/sanity');
export const packageJsonPath = resolve(packageRoot, 'package.json');
export const changelogPath = resolve(packageRoot, 'CHANGELOG.md');
export const artifactDir = resolve(workspaceRoot, '.compat/artifacts');
export const releaseTagPrefix = 'sanity@';
export const repoUrl = 'https://github.com/limitless-angular/limitless-angular';

export const sanityPackageRelativePaths = {
  changelog: 'packages/sanity/CHANGELOG.md',
  packageJson: 'packages/sanity/package.json',
};

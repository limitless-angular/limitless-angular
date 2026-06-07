import { join } from 'node:path';

import {
  artifactDir,
  assertCompatibilityConfig,
  cleanupWorkspace,
  config,
  copySanityPackage,
  createWorkspace,
  ensureCleanDir,
  findTarballs,
  readJson,
  resolveAngularToolchain,
  run,
  writePnpmWorkspaceConfig,
  writeJson,
} from './lib.mjs';

const result = assertCompatibilityConfig();
const toolchain = resolveAngularToolchain(result.buildAngularMajor, {
  includeNgPackagr: true,
});
const workspace = createWorkspace('limitless-angular-compat-build-');

try {
  ensureCleanDir(artifactDir);

  const packageRoot = copySanityPackage(workspace);
  writePnpmWorkspaceConfig(workspace, ['packages/sanity', 'packages/sanity/*']);
  const packageJsonPath = join(packageRoot, 'package.json');
  const packageJson = readJson(packageJsonPath);
  const previewKitCompatPackageJson = readJson(
    join(packageRoot, 'preview-kit-compat/package.json'),
  );
  const visualEditingHelpersPackageJson = readJson(
    join(packageRoot, 'visual-editing-helpers/package.json'),
  );

  packageJson.private = true;
  packageJson.devDependencies = {
    ...packageJson.peerDependencies,
    ...previewKitCompatPackageJson.peerDependencies,
    ...visualEditingHelpersPackageJson.peerDependencies,
    '@angular/common': toolchain.angularVersion,
    '@angular/compiler': toolchain.angularVersion,
    '@angular/compiler-cli': toolchain.angularVersion,
    '@angular/core': toolchain.angularVersion,
    '@angular/router': toolchain.angularVersion,
    '@types/lodash-es': packageJson.devDependencies['@types/lodash-es'],
    '@types/node': packageJson.devDependencies['@types/node'],
    'ng-packagr': toolchain.ngPackagrVersion,
    typescript: toolchain.typescriptVersion,
  };

  writeJson(packageJsonPath, packageJson);

  console.log(
    `Building ${config.packageName} with Angular ${toolchain.angularVersion}, ng-packagr ${toolchain.ngPackagrVersion}, TypeScript ${toolchain.typescriptVersion}.`,
  );
  run('pnpm', ['install', '--no-frozen-lockfile'], { cwd: packageRoot });
  run('pnpm', ['run', 'build'], { cwd: packageRoot });

  const distPackageRoot = join(workspace, 'dist/packages/sanity');
  run('pnpm', ['pack', '--pack-destination', artifactDir], {
    cwd: distPackageRoot,
  });

  const tarballs = findTarballs();
  if (tarballs.length !== 1) {
    throw new Error(
      `Expected exactly one packed artifact, found ${tarballs.length}`,
    );
  }

  console.log(`Packed ${tarballs[0]}`);
} finally {
  cleanupWorkspace(workspace);
}

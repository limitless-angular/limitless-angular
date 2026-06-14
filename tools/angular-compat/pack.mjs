import { join } from 'node:path';

import semver from 'semver';

import {
  artifactDir,
  assertTarballIntegrity,
  assertCompatibilityConfig,
  cleanupWorkspace,
  config,
  copySanityPackage,
  createWorkspace,
  ensureCleanDir,
  findTarballs,
  plannedPackageVersionEnv,
  readJson,
  resolveAngularToolchain,
  run,
  writePnpmWorkspaceConfig,
  writeJson,
} from './lib.mjs';

export function packCompatibilityArtifact() {
  const result = assertCompatibilityConfig();
  const toolchain = resolveAngularToolchain(result.buildAngularMajor, {
    includeNgPackagr: true,
  });
  const workspace = createWorkspace('limitless-angular-compat-build-');
  const plannedPackageVersion = getPlannedPackageVersion();

  try {
    ensureCleanDir(artifactDir);

    const packageRoot = copySanityPackage(workspace);
    writePnpmWorkspaceConfig(workspace, [
      'packages/sanity',
      'packages/sanity/*',
    ]);
    const packageJsonPath = join(packageRoot, 'package.json');
    const packageJson = readJson(packageJsonPath);

    if (plannedPackageVersion) {
      packageJson.version = plannedPackageVersion;
    }

    packageJson.private = true;
    packageJson.devDependencies = {
      ...packageJson.peerDependencies,
      '@angular/common': toolchain.angularVersion,
      '@angular/compiler': toolchain.angularVersion,
      '@angular/compiler-cli': toolchain.compilerCliVersion,
      '@angular/core': toolchain.angularVersion,
      '@angular/router': toolchain.angularVersion,
      '@types/lodash-es': packageJson.devDependencies['@types/lodash-es'],
      '@types/node': packageJson.devDependencies['@types/node'],
      'ng-packagr': toolchain.ngPackagrVersion,
      typescript: toolchain.typescriptVersion,
    };

    writeJson(packageJsonPath, packageJson);

    console.log(
      `Building ${config.packageName} with ${toolchain.label}: Angular ${toolchain.angularVersion}, ng-packagr ${toolchain.ngPackagrVersion}, TypeScript ${toolchain.typescriptVersion}.`,
    );
    run('pnpm', ['install', '--no-frozen-lockfile'], { cwd: packageRoot });
    run('pnpm', ['run', 'build'], { cwd: packageRoot });

    const distPackageRoot = join(workspace, 'dist/packages/sanity');
    const distPackageJsonPath = join(distPackageRoot, 'package.json');
    const distPackageJson = readJson(distPackageJsonPath);
    if (plannedPackageVersion) {
      distPackageJson.version = plannedPackageVersion;
    }
    delete distPackageJson.private;
    writeJson(distPackageJsonPath, distPackageJson);

    run('pnpm', ['pack', '--pack-destination', artifactDir], {
      cwd: distPackageRoot,
    });

    const tarballs = findTarballs();
    if (tarballs.length !== 1) {
      throw new Error(
        `Expected exactly one packed artifact, found ${tarballs.length}`,
      );
    }

    assertTarballIntegrity(tarballs[0]);
    console.log(`Packed ${tarballs[0]}`);
  } finally {
    cleanupWorkspace(workspace);
  }
}

function getPlannedPackageVersion() {
  const plannedPackageVersion = process.env[plannedPackageVersionEnv];

  if (!plannedPackageVersion) {
    return null;
  }

  if (!semver.valid(plannedPackageVersion)) {
    throw new Error(
      `${plannedPackageVersionEnv} must be a valid semver version, found ${plannedPackageVersion}.`,
    );
  }

  return plannedPackageVersion;
}

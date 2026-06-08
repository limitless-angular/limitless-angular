import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { capture as defaultCapture } from './commands.mjs';
import { artifactDir as defaultArtifactDir, workspaceRoot } from './config.mjs';

export function findTarballs(path = defaultArtifactDir) {
  if (!existsSync(path)) {
    return [];
  }

  return readdirSync(path)
    .filter((file) => file.endsWith('.tgz'))
    .map((file) => resolve(path, file));
}

export function resolveTarball(options = {}) {
  if (options.tarballPath) {
    return resolve(workspaceRoot, options.tarballPath);
  }

  const tarballs = (options.findTarballs ?? findTarballs)(
    options.artifactDir ?? defaultArtifactDir,
  );
  if (tarballs.length !== 1) {
    throw new Error(
      `Expected exactly one release tarball in .compat/artifacts, found ${tarballs.length}`,
    );
  }

  return tarballs[0];
}

export function readTarballPackageJson(tarballPath, options = {}) {
  const commandCapture = options.capture ?? defaultCapture;

  return JSON.parse(
    commandCapture('tar', ['-xOf', tarballPath, 'package/package.json']),
  );
}

export function assertPlannedArtifactVersion(plan, options = {}) {
  const tarballPath = resolveTarball(options);
  const packageJson = (
    options.readTarballPackageJson ?? readTarballPackageJson
  )(tarballPath, options);

  if (packageJson.name !== plan.packageName) {
    throw new Error(
      `Packed artifact name ${packageJson.name} does not match ${plan.packageName}`,
    );
  }

  if (packageJson.version !== plan.nextVersion) {
    throw new Error(
      `Packed artifact version ${packageJson.version} does not match planned release version ${plan.nextVersion}`,
    );
  }

  console.log(`Packed artifact version matches release plan: ${tarballPath}`);
  return { packageJson, tarballPath };
}

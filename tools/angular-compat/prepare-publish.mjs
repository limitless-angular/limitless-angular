import { resolve } from 'node:path';

import {
  distPackageRoot,
  preparePublishablePackage,
  workspaceRoot,
} from './lib.mjs';

export function preparePublish(options = {}) {
  const packageRoot = options.packageRoot
    ? resolve(workspaceRoot, options.packageRoot)
    : distPackageRoot;
  const packageJson = preparePublishablePackage(packageRoot, {
    version: options.version,
  });

  console.log(
    `Prepared ${packageJson.name}@${packageJson.version} for publishing from ${packageRoot}.`,
  );

  return packageJson;
}

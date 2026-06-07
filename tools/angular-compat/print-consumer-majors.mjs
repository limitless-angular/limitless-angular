import { assertCompatibilityConfig } from './lib.mjs';

export function printConsumerMatrix(options = {}) {
  process.stdout.write(JSON.stringify(getConsumerMatrix(options)));
}

export function getConsumerMatrix(options = {}) {
  const result = assertCompatibilityConfig();
  const versionSets = options.canary
    ? result.canaryVersionSets
    : result.consumerVersionSets;

  return versionSets.map((versionSet) => ({
    id: versionSet.id,
    angular: versionSet.angularMajor ?? versionSet.npmTag,
    mode: versionSet.mode,
  }));
}

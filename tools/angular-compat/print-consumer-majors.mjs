import { assertCompatibilityConfig } from './lib.mjs';

const options = parseArgs(process.argv.slice(2));
const result = assertCompatibilityConfig();
const versionSets = options.canary
  ? result.canaryVersionSets
  : result.consumerVersionSets;

process.stdout.write(
  JSON.stringify(
    versionSets.map((versionSet) => ({
      id: versionSet.id,
      angular: versionSet.angularMajor ?? versionSet.npmTag,
      mode: versionSet.mode,
    })),
  ),
);

function parseArgs(args) {
  const parsed = {};
  for (const arg of args) {
    if (arg === '--canary') {
      parsed.canary = true;
    } else {
      throw new Error(`Unknown argument ${arg}`);
    }
  }

  return parsed;
}

import { assertTarballIntegrity, resolveTarball } from './lib.mjs';

const tarball = resolveTarball(parseArgs(process.argv.slice(2)).tarball);
assertTarballIntegrity(tarball);

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--') {
      continue;
    } else if (arg === '--tarball') {
      parsed.tarball = args[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument ${arg}`);
    }
  }

  return parsed;
}

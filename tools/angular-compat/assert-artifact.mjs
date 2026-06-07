import { assertTarballIntegrity, resolveTarball } from './lib.mjs';

export function assertArtifact(options = {}) {
  const tarball = resolveTarball(options.tarball);
  assertTarballIntegrity(tarball);
}

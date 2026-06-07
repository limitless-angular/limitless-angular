import { assertCompatibilityConfig } from './lib.mjs';

export function assertPeerMatrix() {
  const result = assertCompatibilityConfig();

  console.log(
    `Angular compatibility config is valid: build with Angular ${result.buildAngularMajor}, test consumers ${result.consumerVersionSets.map((versionSet) => versionSet.id).join(', ')}.`,
  );
}

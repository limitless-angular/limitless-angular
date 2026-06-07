import { assertArtifact } from './assert-artifact.mjs';
import { assertPeerMatrix } from './assert-peer-matrix.mjs';
import { packCompatibilityArtifact } from './pack.mjs';
import { testConsumers } from './test-consumer.mjs';

export function runCompatibilityPipeline() {
  assertPeerMatrix();
  packCompatibilityArtifact();
  assertArtifact();
  testConsumers();
}

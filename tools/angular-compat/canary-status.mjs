import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { assertCompatibilityConfig, workspaceRoot, writeJson } from './lib.mjs';

const ansiPattern = /\u001b\[[0-?]*[ -/]*[@-~]/g;
const failurePatterns = [
  /\bTS\d+:/,
  /\bNG\d+:/,
  /\bError:/i,
  /\bERROR\b/i,
  /\bERR_[A-Z0-9_]+\b/,
  /\bnpm ERR!/i,
];

export function writeCanaryStatus(options) {
  const versionSet = parseVersionSet(options.versionSetJson);
  const exitCode = Number(options.exitCode);
  if (!Number.isInteger(exitCode)) {
    throw new Error(`Invalid canary exit code: ${options.exitCode}`);
  }

  const logPath = resolve(workspaceRoot, options.logPath);
  const outPath = resolve(workspaceRoot, options.outPath);
  const log = readFileSync(logPath, 'utf8');
  const status = exitCode === 0 ? 'passed' : 'failed';
  const compatibility = assertCompatibilityConfig();
  const failureSummary =
    status === 'failed' ? summarizeFailure(log, exitCode) : undefined;

  mkdirSync(dirname(outPath), { recursive: true });
  writeJson(outPath, {
    id: versionSet.id,
    angular: versionSet.angular,
    angularMajor: versionSet.angularMajor,
    mode: versionSet.mode,
    npmTag: versionSet.npmTag,
    target: formatTarget(versionSet),
    status,
    exitCode,
    failureSummary,
    angularPeerRange: compatibility.angularPeerRange,
    logPath: options.logPath,
  });

  console.log(`Angular canary ${versionSet.id} ${status}.`);
  if (failureSummary) {
    console.log(
      `::warning::Angular canary compatibility failed for ${versionSet.id}: ${failureSummary}`,
    );
  }
}

function parseVersionSet(versionSetJson) {
  if (!versionSetJson) {
    throw new Error('Missing --version-set-json');
  }

  const versionSet = JSON.parse(versionSetJson);
  if (!versionSet.id || typeof versionSet.id !== 'string') {
    throw new Error('Canary version set JSON must include a string id');
  }

  return versionSet;
}

function summarizeFailure(log, exitCode) {
  const lines = stripAnsi(log)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const failureLine = lines.find((line) =>
    failurePatterns.some((pattern) => pattern.test(line)),
  );

  return failureLine ?? `compat:test exited with code ${exitCode}`;
}

function formatTarget(versionSet) {
  const target =
    versionSet.angular ?? versionSet.angularMajor ?? versionSet.npmTag;
  return target ? `Angular ${target}` : versionSet.id;
}

function stripAnsi(value) {
  return value.replaceAll(ansiPattern, '');
}

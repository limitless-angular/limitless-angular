import { readJson, readText, writeJson, writeText } from './files.mjs';

export function applyReleasePlan(plan) {
  const snapshot = snapshotReleaseFiles(plan);
  const packageJson = readJson(plan.paths.packageJsonPath);

  packageJson.version = plan.nextVersion;
  writeJson(plan.paths.packageJsonPath, packageJson);
  writeText(
    plan.paths.changelogPath,
    `${plan.changelogSection}\n${snapshot.changelog.trimStart()}`,
  );

  return snapshot;
}

export function restoreReleaseFiles(snapshot) {
  writeText(snapshot.changelogPath, snapshot.changelog);
  writeText(snapshot.packageJsonPath, snapshot.packageJson);
}

function snapshotReleaseFiles(plan) {
  return {
    changelog: readText(plan.paths.changelogPath),
    changelogPath: plan.paths.changelogPath,
    packageJson: readText(plan.paths.packageJsonPath),
    packageJsonPath: plan.paths.packageJsonPath,
  };
}

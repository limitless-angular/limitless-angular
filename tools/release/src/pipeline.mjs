import { assertPlannedArtifactVersion } from './artifact.mjs';
import { capture as defaultCapture, run as defaultRun } from './commands.mjs';
import { createReleasePlan, printReleasePlan } from './plan.mjs';
import {
  commitRelease,
  createGitHubRelease,
  publishTarball,
  pushRelease,
} from './publish.mjs';
import { applyReleasePlan, restoreReleaseFiles } from './workspace.mjs';

export const releaseModes = {
  dryRun: 'dry-run',
  publish: 'publish',
};

export const compatibilityValidationSteps = [
  {
    args: [
      'turbo',
      'run',
      'compat:pack',
      '--filter=@limitless-angular/angular-compat',
    ],
    command: 'pnpm',
    id: 'compat:pack',
  },
  {
    args: [
      'turbo',
      'run',
      'compat:artifact',
      '--filter=@limitless-angular/angular-compat',
    ],
    command: 'pnpm',
    id: 'compat:artifact',
  },
  {
    args: [
      '--dir',
      'tools/angular-compat',
      'exec',
      'playwright',
      'install',
      '--with-deps',
      'chromium',
    ],
    command: 'pnpm',
    id: 'playwright:install',
  },
  {
    args: [
      'turbo',
      'run',
      'compat:test',
      '--filter=@limitless-angular/angular-compat',
    ],
    command: 'pnpm',
    id: 'compat:test',
  },
];

export function runReleasePipeline(options = {}) {
  const mode = normalizeMode(options.mode ?? releaseModes.dryRun);
  const commandRun = options.run ?? defaultRun;
  const commandCapture = options.capture ?? defaultCapture;
  const plan = createReleasePlan({
    capture: commandCapture,
    now: options.now,
    paths: options.paths,
    versionSpecifier: options.versionSpecifier,
  });
  let snapshot;
  let publishSideEffectsStarted = false;

  if (options.verbose || mode === releaseModes.dryRun) {
    printReleasePlan(plan);
  }

  try {
    snapshot = applyReleasePlan(plan);

    const artifact = validateReleaseArtifact(plan, {
      artifact: options.artifact,
      run: commandRun,
    });

    if (mode === releaseModes.publish) {
      publishSideEffectsStarted = true;
      commitRelease(plan, { run: commandRun });
      publishTarball(artifact.tarballPath, { run: commandRun });
      pushRelease({ run: commandRun });
      createGitHubRelease(plan, { env: options.env, run: commandRun });
    }

    console.log(`RELEASED_VERSION=${plan.nextVersion}`);
    console.log(
      mode === releaseModes.publish
        ? `Published ${plan.packageName} ${plan.nextVersion}.`
        : `Dry run validated ${plan.packageName} ${plan.nextVersion} without publishing.`,
    );

    return {
      artifact,
      mode,
      plan,
      published: mode === releaseModes.publish,
    };
  } finally {
    if (
      snapshot &&
      (mode === releaseModes.dryRun || !publishSideEffectsStarted)
    ) {
      restoreReleaseFiles(snapshot);
    }
  }
}

export function validateReleaseArtifact(plan, options = {}) {
  const commandRun = options.run ?? defaultRun;

  runCompatibilityStep('compat:pack', commandRun);
  runCompatibilityStep('compat:artifact', commandRun);
  const artifact = assertPlannedArtifactVersion(plan, options.artifact);
  runCompatibilityStep('playwright:install', commandRun);
  runCompatibilityStep('compat:test', commandRun);

  return artifact;
}

function runCompatibilityStep(id, commandRun) {
  const step = compatibilityValidationSteps.find(
    (candidate) => candidate.id === id,
  );

  if (!step) {
    throw new Error(`Unknown compatibility validation step: ${id}`);
  }

  commandRun(step.command, step.args);
}

function normalizeMode(mode) {
  if (mode === releaseModes.dryRun || mode === releaseModes.publish) {
    return mode;
  }

  throw new Error(`Unknown release mode: ${mode}`);
}

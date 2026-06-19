import { assertPlannedArtifactVersion } from './artifact.mjs';
import { capture as defaultCapture, run as defaultRun } from './commands.mjs';
import { plannedPackageVersionEnv } from './config.mjs';
import { createReleasePlan, printReleasePlan } from './plan.mjs';
import {
  createGitHubRelease,
  ensureReleaseTag,
  publishTarball,
} from './publish.mjs';
import {
  assertFinalPublishPreconditions,
  assertPublishPreconditions,
} from './preflight.mjs';

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
    allowMajorWithoutPrerelease: options.allowMajorWithoutPrerelease,
    bump: options.bump,
    capture: commandCapture,
    manualReason: options.manualReason,
    manualVersion: options.manualVersion,
    now: options.now,
    paths: options.paths,
    releaseIntent: options.releaseIntent,
  });
  if (options.verbose || mode === releaseModes.dryRun) {
    printReleasePlan(plan);
  }

  if (mode === releaseModes.publish) {
    assertPublishPreconditions(plan, {
      capture: commandCapture,
      env: options.env,
      run: commandRun,
    });
  }

  const artifact = validateReleaseArtifact(plan, {
    artifact: options.artifact,
    run: commandRun,
  });

  if (mode === releaseModes.publish) {
    assertFinalPublishPreconditions(plan, {
      capture: commandCapture,
      env: options.env,
      run: commandRun,
    });
    ensureReleaseTag(plan, {
      capture: commandCapture,
      run: commandRun,
    });
    publishTarball(plan, artifact.tarballPath, {
      capture: commandCapture,
      run: commandRun,
    });
    createGitHubRelease(plan, {
      capture: commandCapture,
      env: options.env,
      run: commandRun,
    });
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
}

export function validateReleaseArtifact(plan, options = {}) {
  const commandRun = options.run ?? defaultRun;

  runCompatibilityStep('compat:pack', commandRun, {
    env: { [plannedPackageVersionEnv]: plan.nextVersion },
  });
  runCompatibilityStep('compat:artifact', commandRun, {
    env: { [plannedPackageVersionEnv]: plan.nextVersion },
  });
  const artifact = assertPlannedArtifactVersion(plan, options.artifact);
  runCompatibilityStep('playwright:install', commandRun);
  runCompatibilityStep('compat:test', commandRun, {
    env: { [plannedPackageVersionEnv]: plan.nextVersion },
  });

  return artifact;
}

function runCompatibilityStep(id, commandRun, options = {}) {
  const step = compatibilityValidationSteps.find(
    (candidate) => candidate.id === id,
  );

  if (!step) {
    throw new Error(`Unknown compatibility validation step: ${id}`);
  }

  commandRun(step.command, step.args, options);
}

function normalizeMode(mode) {
  if (mode === releaseModes.dryRun || mode === releaseModes.publish) {
    return mode;
  }

  throw new Error(`Unknown release mode: ${mode}`);
}

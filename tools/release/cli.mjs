import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import {
  assertReleasePlanSummaryMatches,
  createReleasePlan,
  printReleasePlan,
  releaseBumps,
  releaseIntents,
  summarizeReleasePlan,
} from './src/plan.mjs';
import { releaseModes, runReleasePipeline } from './src/pipeline.mjs';

export function runCli(args = hideBin(process.argv)) {
  return yargs(args)
    .scriptName('release-tools')
    .version(false)
    .command(
      'plan',
      'Print the computed release plan without changing files.',
      (command) =>
        addReleaseOptions(command).option('json', {
          describe: 'Print the release plan as JSON.',
          type: 'boolean',
          default: false,
        }),
      (argv) => {
        const plan = createReleasePlan({
          ...toReleaseOptions(argv),
        });

        if (argv.json) {
          console.log(JSON.stringify(summarizeReleasePlan(plan), null, 2));
          return;
        }

        printReleasePlan(plan);
      },
    )
    .command(
      'notes',
      'Print the planned GitHub Release notes without changing files.',
      (command) => addReleaseOptions(command),
      (argv) => {
        const plan = createReleasePlan({
          ...toReleaseOptions(argv),
        });

        process.stdout.write(plan.releaseNotes);
      },
    )
    .command(
      'run',
      'Run the release pipeline. Defaults to dry-run mode.',
      (command) =>
        addPipelineOptions(command).option('mode', {
          choices: Object.values(releaseModes),
          default: releaseModes.dryRun,
          describe: 'Release pipeline mode.',
          type: 'string',
        }),
      (argv) =>
        runReleasePipeline({
          mode: argv.mode,
          ...toReleaseOptions(argv),
          verbose: argv.verbose,
        }),
    )
    .command(
      'dry-run',
      'Validate the prospective release without publishing.',
      (command) => addPipelineOptions(command),
      (argv) =>
        runReleasePipeline({
          mode: releaseModes.dryRun,
          ...toReleaseOptions(argv),
          verbose: argv.verbose,
        }),
    )
    .command(
      'publish',
      'Validate and publish the prospective release.',
      (command) => addPipelineOptions(command),
      (argv) =>
        runReleasePipeline({
          mode: releaseModes.publish,
          ...toReleaseOptions(argv),
          verbose: argv.verbose,
        }),
    )
    .command(
      'verify-plan',
      'Verify two release plan summaries describe the same release.',
      (command) =>
        command
          .option('expected', {
            demandOption: true,
            describe: 'Path to the validated release plan JSON.',
            type: 'string',
          })
          .option('actual', {
            demandOption: true,
            describe: 'Path to the recomputed release plan JSON.',
            type: 'string',
          }),
      (argv) => {
        assertReleasePlanSummaryMatches(
          readPlanSummary(argv.expected),
          readPlanSummary(argv.actual),
        );
        console.log('Release plan matches validated dry-run plan.');
      },
    )
    .demandCommand(1, 'Specify a release command.')
    .recommendCommands()
    .strict()
    .help()
    .parse();
}

function addPipelineOptions(command) {
  return addReleaseOptions(command).option('verbose', {
    describe: 'Print the release plan before executing.',
    type: 'boolean',
    default: false,
  });
}

function addReleaseOptions(command) {
  return command
    .option('intent', {
      choices: Object.values(releaseIntents),
      describe: 'Release intent to execute.',
      type: 'string',
    })
    .option('bump', {
      choices: Object.values(releaseBumps),
      describe:
        'Version bump for stable or prerelease intents. Defaults to auto.',
      type: 'string',
    })
    .option('allow-major-without-prerelease', {
      describe:
        'Allow a stable major release without first publishing a prerelease train.',
      type: 'boolean',
      default: false,
    })
    .option('manual-version', {
      describe:
        'Exact semver version to publish when using the manual release intent.',
      type: 'string',
    })
    .option('manual-reason', {
      describe:
        'Reason for using the manual release intent. Required with manual releases.',
      type: 'string',
    });
}

function toReleaseOptions(argv) {
  return {
    allowMajorWithoutPrerelease: argv.allowMajorWithoutPrerelease,
    bump: argv.bump,
    manualReason: argv.manualReason,
    manualVersion: argv.manualVersion,
    releaseIntent: argv.intent,
  };
}

function readPlanSummary(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runCli();
}

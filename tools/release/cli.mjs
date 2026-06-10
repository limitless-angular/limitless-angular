import { pathToFileURL } from 'node:url';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import {
  createReleasePlan,
  printReleasePlan,
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
        addVersionOption(command).option('json', {
          describe: 'Print the release plan as JSON.',
          type: 'boolean',
          default: false,
        }),
      (argv) => {
        const plan = createReleasePlan({
          prerelease: argv.prerelease,
          versionSpecifier: argv.version,
        });

        if (argv.json) {
          console.log(JSON.stringify(summarizeReleasePlan(plan), null, 2));
          return;
        }

        printReleasePlan(plan);
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
          prerelease: argv.prerelease,
          verbose: argv.verbose,
          versionSpecifier: argv.version,
        }),
    )
    .command(
      'dry-run',
      'Validate the prospective release without publishing.',
      (command) => addPipelineOptions(command),
      (argv) =>
        runReleasePipeline({
          mode: releaseModes.dryRun,
          prerelease: argv.prerelease,
          verbose: argv.verbose,
          versionSpecifier: argv.version,
        }),
    )
    .command(
      'publish',
      'Validate and publish the prospective release.',
      (command) => addPipelineOptions(command),
      (argv) =>
        runReleasePipeline({
          mode: releaseModes.publish,
          prerelease: argv.prerelease,
          verbose: argv.verbose,
          versionSpecifier: argv.version,
        }),
    )
    .demandCommand(1, 'Specify a release command.')
    .recommendCommands()
    .strict()
    .help()
    .parse();
}

function addPipelineOptions(command) {
  return addVersionOption(command).option('verbose', {
    describe: 'Print the release plan before executing.',
    type: 'boolean',
    default: false,
  });
}

function addVersionOption(command) {
  return command
    .option('version', {
      describe:
        'Explicit semver version or semver increment to release, such as 19.3.0, patch, minor, or major.',
      type: 'string',
    })
    .option('prerelease', {
      default: false,
      describe:
        'Infer or coerce the planned version to a next prerelease, such as 19.3.0-next.0.',
      type: 'boolean',
    });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runCli();
}

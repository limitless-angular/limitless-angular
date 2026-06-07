import { pathToFileURL } from 'node:url';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { assertArtifact } from './assert-artifact.mjs';
import { assertPeerMatrix } from './assert-peer-matrix.mjs';
import { assertReleaseParity } from './assert-release-parity.mjs';
import { printCanaryReport } from './canary-report.mjs';
import { writeCanaryStatus } from './canary-status.mjs';
import { packCompatibilityArtifact } from './pack.mjs';
import { printConsumerMatrix } from './print-consumer-majors.mjs';
import { runCompatibilityPipeline } from './run.mjs';
import { testConsumers } from './test-consumer.mjs';

export function runCli(args = hideBin(process.argv)) {
  return yargs(args)
    .scriptName('angular-compat')
    .command(
      'assert',
      'Validate the configured Angular compatibility peer matrix.',
      (command) => command,
      () => assertPeerMatrix(),
    )
    .command(
      'artifact',
      'Validate the packed compatibility tarball shape.',
      (command) => addTarballOption(command),
      (argv) => assertArtifact(toOptions(argv)),
    )
    .command(
      'canary-status',
      'Write an advisory Angular canary status JSON file.',
      (command) =>
        command
          .option('version-set-json', {
            describe: 'JSON representation of the canary version set.',
            type: 'string',
            demandOption: true,
          })
          .option('exit-code', {
            describe: 'Exit code from the canary compatibility command.',
            type: 'number',
            demandOption: true,
          })
          .option('log', {
            describe: 'Path to the captured canary compatibility log.',
            type: 'string',
            demandOption: true,
          })
          .option('metadata', {
            describe:
              'Path to structured metadata from the canary compatibility command.',
            type: 'string',
          })
          .option('out', {
            describe: 'Path where the canary status JSON should be written.',
            type: 'string',
            demandOption: true,
          }),
      (argv) =>
        writeCanaryStatus({
          exitCode: argv.exitCode,
          logPath: argv.log,
          metadataPath: argv.metadata,
          outPath: argv.out,
          versionSetJson: argv.versionSetJson,
        }),
    )
    .command(
      'canary-report',
      'Render the advisory Angular canary report from status artifacts.',
      (command) =>
        command
          .option('status-dir', {
            describe: 'Directory containing canary status JSON artifacts.',
            type: 'string',
            default: '.compat/canary-status',
          })
          .option('download-outcome', {
            describe: 'Outcome from the artifact download step.',
            type: 'string',
            default: 'success',
          })
          .option('run-url', {
            describe: 'Workflow run URL to include in the rendered report.',
            type: 'string',
          })
          .option('workflow-name', {
            describe: 'Workflow name to include in the rendered report.',
            type: 'string',
          })
          .option('run-number', {
            describe: 'Workflow run number to include in the rendered report.',
            type: 'number',
          }),
      (argv) =>
        printCanaryReport({
          downloadOutcome: argv.downloadOutcome,
          runNumber: argv.runNumber,
          runUrl: argv.runUrl,
          statusDir: argv.statusDir,
          workflowName: argv.workflowName,
        }),
    )
    .command(
      'matrix',
      'Print the stable or canary Angular compatibility matrix as JSON.',
      (command) =>
        command.option('canary', {
          describe:
            'Print advisory canary version sets instead of stable consumers.',
          type: 'boolean',
          default: false,
        }),
      (argv) => printConsumerMatrix(toOptions(argv)),
    )
    .command(
      'pack',
      'Build and pack the compatibility-tested library artifact.',
      (command) => command,
      () => packCompatibilityArtifact(),
    )
    .command(
      'release-parity',
      'Assert that release publishing uses the compatibility pipeline.',
      (command) => command,
      () => assertReleaseParity(),
    )
    .command(
      'run',
      'Run the full compatibility pipeline.',
      (command) => command,
      () => runCompatibilityPipeline(),
    )
    .command(
      'test',
      'Test the packed artifact in generated Angular consumers.',
      (command) =>
        addTarballOption(command)
          .option('angular', {
            describe:
              'Run the latest configured version set for the given Angular major.',
            type: 'number',
          })
          .option('set', {
            describe: 'Run one configured compatibility version set by id.',
            type: 'string',
          })
          .option('skip-runtime', {
            describe: 'Skip the Playwright runtime smoke test.',
            type: 'boolean',
            default: false,
          })
          .option('metadata-out', {
            describe:
              'Path where generated consumer metadata should be written.',
            type: 'string',
          })
          .conflicts('angular', 'set'),
      (argv) => testConsumers(toOptions(argv)),
    )
    .demandCommand(1, 'Specify a compatibility command.')
    .recommendCommands()
    .strict()
    .help()
    .parse();
}

function addTarballOption(command) {
  return command.option('tarball', {
    describe: 'Path to a packed .tgz artifact.',
    type: 'string',
  });
}

function toOptions(argv) {
  return {
    angular: argv.angular,
    canary: argv.canary,
    metadataOut: argv.metadataOut,
    set: argv.set,
    skipRuntime: argv.skipRuntime,
    tarball: argv.tarball,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runCli();
}

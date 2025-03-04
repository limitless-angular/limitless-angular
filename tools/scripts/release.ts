import { execSync } from 'node:child_process';
import { releaseChangelog, releaseVersion } from 'nx/src/command-line/release';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

(async () => {
  try {
    const options = await yargs(hideBin(process.argv))
      .version(false)
      .option('version', {
        description:
          'Explicit version specifier to use, if overriding conventional commits',
        type: 'string',
      })
      .option('dryRun', {
        alias: 'd',
        description:
          'Whether or not to perform a dry-run of the release process, defaults to true',
        type: 'boolean',
        default: true,
      })
      .option('verbose', {
        description:
          'Whether or not to enable verbose logging, defaults to false',
        type: 'boolean',
        default: false,
      })
      .parseAsync();

    const { workspaceVersion, projectsVersionData } = await releaseVersion({
      specifier: options.version,
      // stage package.json updates to be committed later by the changelog command
      stageChanges: true,
      dryRun: options.dryRun,
      verbose: options.verbose,
    });

    // This will create a release on GitHub, which will act as a trigger for the publish.yml workflow
    await releaseChangelog({
      versionData: projectsVersionData,
      version: workspaceVersion,
      interactive: 'workspace',
      dryRun: options.dryRun,
      verbose: options.verbose,
    });

    // Output the final version to be captured by the workflow
    console.log(`RELEASED_VERSION=${workspaceVersion}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

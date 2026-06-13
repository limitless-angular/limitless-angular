import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspacePackageName = '@limitless-angular/source';
const sanityPackageRelativePath = 'packages/sanity/package.json';
const compatConfigRelativePath = 'tools/angular-compat/config.json';
const angularPeerDependencies = [
  '@angular/common',
  '@angular/core',
  '@angular/router',
];
const versionSetModeOrder = new Map([
  ['floor', 0],
  ['latest', 1],
]);

main();

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      printUsage();
      return;
    }

    const major = parseMajor(args.major);
    const workspaceRoot = args.workspace
      ? resolve(args.workspace)
      : findWorkspaceRoot(process.cwd());
    assertWorkspaceRoot(workspaceRoot);
    const supportedMajors = readSupportedAngularMajors(workspaceRoot);
    supportedMajors.add(major);

    const changes = [];
    updateJsonFile(
      workspaceRoot,
      sanityPackageRelativePath,
      (packageJson) => updateSanityPeerDependencies(packageJson, supportedMajors),
      { changes, dryRun: args.dryRun },
    );
    updateJsonFile(
      workspaceRoot,
      compatConfigRelativePath,
      (config) => updateCompatibilityConfig(config, supportedMajors),
      { changes, dryRun: args.dryRun },
    );

    printResult({ changes, dryRun: args.dryRun, major });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    help: false,
    major: undefined,
    workspace: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === '--dry-run') {
      args.dryRun = true;
      continue;
    }

    if (value === '--help' || value === '-h') {
      args.help = true;
      continue;
    }

    if (value === '--major') {
      args.major = readOptionValue(argv, index, '--major');
      index += 1;
      continue;
    }

    if (value === '--workspace') {
      args.workspace = readOptionValue(argv, index, '--workspace');
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${value}`);
  }

  return args;
}

function readOptionValue(argv, index, option) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${option}`);
  }

  return value;
}

function parseMajor(value) {
  if (!value || !/^\d+$/.test(value)) {
    throw new Error('Missing or invalid --major value; expected an integer Angular major.');
  }

  const major = Number(value);
  if (!Number.isSafeInteger(major) || major < 1) {
    throw new Error(`Invalid Angular major: ${value}`);
  }

  return major;
}

function findWorkspaceRoot(startPath) {
  let current = resolve(startPath);

  while (true) {
    const packageJsonPath = join(current, 'package.json');
    if (existsSync(packageJsonPath)) {
      const packageJson = readJson(packageJsonPath);
      if (packageJson.name === workspacePackageName) {
        return current;
      }
    }

    const parent = dirname(current);
    if (parent === current) {
      throw new Error(
        `Unable to find workspace root with package name ${workspacePackageName}. Use --workspace.`,
      );
    }
    current = parent;
  }
}

function assertWorkspaceRoot(workspaceRoot) {
  const packageJsonPath = join(workspaceRoot, 'package.json');
  if (!existsSync(packageJsonPath)) {
    throw new Error(`Workspace package.json not found: ${packageJsonPath}`);
  }

  const packageJson = readJson(packageJsonPath);
  if (packageJson.name !== workspacePackageName) {
    throw new Error(
      `Expected workspace package ${workspacePackageName}, found ${packageJson.name ?? 'unknown'}.`,
    );
  }
}

function updateJsonFile(workspaceRoot, relativePath, updater, options) {
  const path = join(workspaceRoot, relativePath);
  const beforeText = readFileSync(path, 'utf8');
  const beforeJson = JSON.parse(beforeText);
  const afterJson = updater(beforeJson);
  const afterText = `${JSON.stringify(afterJson, null, 2)}\n`;

  if (afterText === beforeText) {
    return;
  }

  options.changes.push(relativePath);
  if (!options.dryRun) {
    writeFileSync(path, afterText);
  }
}

function updateSanityPeerDependencies(packageJson, supportedMajors) {
  const peerDependencies = packageJson.peerDependencies;
  if (!peerDependencies || typeof peerDependencies !== 'object') {
    throw new Error(`${sanityPackageRelativePath} must define peerDependencies.`);
  }

  const peerRange = [...supportedMajors]
    .sort((left, right) => left - right)
    .map((peerMajor) => `^${peerMajor}.0.0`)
    .join(' || ');

  for (const dependency of angularPeerDependencies) {
    peerDependencies[dependency] = peerRange;
  }

  return packageJson;
}

function readSupportedAngularMajors(workspaceRoot) {
  const packageJson = readJson(join(workspaceRoot, sanityPackageRelativePath));
  const config = readJson(join(workspaceRoot, compatConfigRelativePath));
  const majors = new Set();
  const peerDependencies = packageJson.peerDependencies;
  if (!peerDependencies || typeof peerDependencies !== 'object') {
    throw new Error(`${sanityPackageRelativePath} must define peerDependencies.`);
  }

  for (const dependency of angularPeerDependencies) {
    const range = peerDependencies[dependency];
    if (!range) {
      throw new Error(`Missing Angular peer dependency ${dependency}.`);
    }

    for (const peerMajor of parseAngularPeerRange(range, dependency)) {
      majors.add(peerMajor);
    }
  }

  if (!Array.isArray(config.consumerVersionSets)) {
    throw new Error(`${compatConfigRelativePath} must define consumerVersionSets.`);
  }

  for (const versionSet of config.consumerVersionSets) {
    if (Number.isInteger(versionSet.angularMajor)) {
      majors.add(versionSet.angularMajor);
    }
  }

  return majors;
}

function parseAngularPeerRange(range, dependency) {
  const parts = String(range)
    .split('||')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    throw new Error(`Empty Angular peer range for ${dependency}.`);
  }

  return parts.map((part) => {
    const match = part.match(/^\^(\d+)\.0\.0$/);
    if (!match) {
      throw new Error(
        `Cannot safely rewrite ${dependency} peer range "${range}". Expected ^<major>.0.0 entries joined by ||.`,
      );
    }

    return Number(match[1]);
  });
}

function updateCompatibilityConfig(config, supportedMajors) {
  if (!Array.isArray(config.consumerVersionSets)) {
    throw new Error(`${compatConfigRelativePath} must define consumerVersionSets.`);
  }

  const versionSets = [...config.consumerVersionSets];
  for (const major of [...supportedMajors].sort((left, right) => left - right)) {
    upsertVersionSet(versionSets, {
      angularMajor: major,
      id: `angular-${major}-floor`,
      mode: 'floor',
    });
    upsertVersionSet(versionSets, {
      angularMajor: major,
      id: `angular-${major}-latest`,
      mode: 'latest',
    });
  }

  versionSets.sort(compareVersionSets);
  config.consumerVersionSets = versionSets;
  config.buildAngularMajor = Math.max(
    ...versionSets
      .map((versionSet) => versionSet.angularMajor)
      .filter((candidate) => Number.isInteger(candidate)),
  );

  return config;
}

function upsertVersionSet(versionSets, expected) {
  const index = versionSets.findIndex((versionSet) => versionSet.id === expected.id);
  if (index === -1) {
    versionSets.push(expected);
    return;
  }

  versionSets[index] = {
    ...versionSets[index],
    angularMajor: expected.angularMajor,
    mode: expected.mode,
  };
}

function compareVersionSets(left, right) {
  const leftMajor = Number.isInteger(left.angularMajor)
    ? left.angularMajor
    : Number.MAX_SAFE_INTEGER;
  const rightMajor = Number.isInteger(right.angularMajor)
    ? right.angularMajor
    : Number.MAX_SAFE_INTEGER;
  if (leftMajor !== rightMajor) {
    return leftMajor - rightMajor;
  }

  const leftMode = versionSetModeOrder.get(left.mode) ?? Number.MAX_SAFE_INTEGER;
  const rightMode = versionSetModeOrder.get(right.mode) ?? Number.MAX_SAFE_INTEGER;
  if (leftMode !== rightMode) {
    return leftMode - rightMode;
  }

  return String(left.id).localeCompare(String(right.id));
}

function printResult({ changes, dryRun, major }) {
  if (changes.length === 0) {
    console.log(`Angular ${major} support is already configured.`);
    return;
  }

  const heading = dryRun
    ? `Dry run: would update Angular ${major} support in:`
    : `Updated Angular ${major} support in:`;
  console.log(heading);
  for (const change of changes) {
    console.log(`- ${change}`);
  }
}

function printUsage() {
  const scriptPath = relative(
    process.cwd(),
    fileURLToPath(import.meta.url),
  );
  console.log(
    `Usage: node ${scriptPath} --major <major> [--workspace <path>] [--dry-run]`,
  );
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

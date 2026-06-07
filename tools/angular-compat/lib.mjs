import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import semver from 'semver';

const toolRoot = dirname(fileURLToPath(import.meta.url));

export const workspaceRoot = resolve(toolRoot, '../..');
export const configPath = join(toolRoot, 'config.json');
export const config = readJson(configPath);
export const packageRoot = resolve(workspaceRoot, config.packageRoot);
export const packageJsonPath = join(packageRoot, 'package.json');
export const artifactDir = resolve(workspaceRoot, config.artifactDir);

export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function run(command, args, options = {}) {
  const cwd = options.cwd ?? workspaceRoot;
  console.log(`\n$ ${[command, ...args].join(' ')}`);
  execFileSync(command, args, {
    cwd,
    env: { ...process.env, ...options.env },
    stdio: 'inherit',
  });
}

export function capture(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd ?? workspaceRoot,
    env: { ...process.env, ...options.env },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
}

export function captureBuffer(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd ?? workspaceRoot,
    env: { ...process.env, ...options.env },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
}

export function ensureCleanDir(path) {
  rmSync(path, { force: true, recursive: true });
  mkdirSync(path, { recursive: true });
}

export function createWorkspace(prefix) {
  return mkdtempSync(resolve(tmpdir(), prefix));
}

export function cleanupWorkspace(path) {
  if (process.env['ANGULAR_COMPAT_KEEP_WORKSPACES']) {
    console.log(`Keeping compatibility workspace at ${path}`);
    return;
  }

  rmSync(path, { force: true, recursive: true });
}

export function copySanityPackage(targetRoot) {
  const targetPackageRoot = join(targetRoot, config.packageRoot);
  mkdirSync(dirname(targetPackageRoot), { recursive: true });
  cpSync(packageRoot, targetPackageRoot, {
    recursive: true,
    filter: (source) => {
      const name = source.split('/').at(-1);
      return ![
        '.angular',
        '.turbo',
        'coverage',
        'dist',
        'node_modules',
      ].includes(name);
    },
  });
  cpSync(
    join(workspaceRoot, 'tsconfig.base.json'),
    join(targetRoot, 'tsconfig.base.json'),
  );
  return targetPackageRoot;
}

export function writePnpmWorkspaceConfig(targetRoot, packages) {
  let allowBuilds = {};
  try {
    allowBuilds = JSON.parse(
      capture('pnpm', ['config', 'get', 'allowBuilds', '--json']),
    );
  } catch {
    allowBuilds = {};
  }

  const lines = [
    'packages:',
    ...packages.map((packagePattern) => `  - '${packagePattern}'`),
  ];

  const approvedBuilds = [
    ...new Set([
      ...Object.entries(allowBuilds)
        .filter(([, allowed]) => allowed)
        .map(([dependency]) => dependency),
      ...(config.allowBuilds ?? []),
    ]),
  ].sort();

  if (approvedBuilds.length > 0) {
    lines.push('allowBuilds:');
    lines.push(
      ...approvedBuilds.map((dependency) => `  '${dependency}': true`),
    );
  }

  writeFileSync(
    join(targetRoot, 'pnpm-workspace.yaml'),
    `${lines.join('\n')}\n`,
  );
}

export function readPackageJson() {
  return readJson(packageJsonPath);
}

export function getSupportedAngularMajors(peerRange) {
  const normalizedRange = semver.validRange(peerRange);
  if (!normalizedRange) {
    throw new Error(`Invalid Angular peer range: ${peerRange}`);
  }

  const majors = [];
  for (let major = 1; major < 100; major += 1) {
    if (
      semver.intersects(normalizedRange, `>=${major}.0.0 <${major + 1}.0.0`)
    ) {
      majors.push(major);
    }
  }

  return majors;
}

export function assertCompatibilityConfig() {
  const packageJson = readPackageJson();
  if (packageJson.name !== config.packageName) {
    throw new Error(
      `Expected package ${config.packageName}, found ${packageJson.name}`,
    );
  }

  const peerRanges = config.angularPeerDependencies.map((dependency) => {
    const range = packageJson.peerDependencies?.[dependency];
    if (!range) {
      throw new Error(`Missing Angular peer dependency ${dependency}`);
    }

    return [dependency, range];
  });
  const [canonicalDependency, canonicalRange] = peerRanges[0];
  for (const [dependency, range] of peerRanges) {
    if (range !== canonicalRange) {
      throw new Error(
        `${dependency} peer range ${range} does not match ${canonicalDependency} peer range ${canonicalRange}`,
      );
    }
  }

  const declaredMajors = getSupportedAngularMajors(canonicalRange);
  const consumerVersionSets = getStableConsumerVersionSets();
  const canaryVersionSets = getCanaryVersionSets();
  assertVersionSets(consumerVersionSets, { allowDistTag: false });
  assertVersionSets(canaryVersionSets, { allowDistTag: true });
  assertUniqueVersionSetIds([...consumerVersionSets, ...canaryVersionSets]);

  const configuredMajors = [
    ...new Set(
      consumerVersionSets.map((versionSet) => versionSet.angularMajor),
    ),
  ].sort((a, b) => a - b);

  if (JSON.stringify(declaredMajors) !== JSON.stringify(configuredMajors)) {
    throw new Error(
      `Angular peer range ${canonicalRange} declares majors ${JSON.stringify(declaredMajors)}, but tools/angular-compat/config.json tests ${JSON.stringify(configuredMajors)}`,
    );
  }

  const latestConfiguredMajor = configuredMajors.at(-1);
  if (config.buildAngularMajor !== latestConfiguredMajor) {
    throw new Error(
      `buildAngularMajor must be the newest configured consumer major (${latestConfiguredMajor}), found ${config.buildAngularMajor}`,
    );
  }

  return {
    packageJson,
    angularPeerRange: canonicalRange,
    consumerVersionSets,
    canaryVersionSets,
    buildAngularMajor: config.buildAngularMajor,
  };
}

export function getStableConsumerVersionSets() {
  if (!Array.isArray(config.consumerVersionSets)) {
    throw new Error(
      'tools/angular-compat/config.json must define consumerVersionSets',
    );
  }

  return config.consumerVersionSets.map(normalizeVersionSet);
}

export function getCanaryVersionSets() {
  return (config.canaryVersionSets ?? []).map(normalizeVersionSet);
}

export function getAllVersionSets() {
  return [...getStableConsumerVersionSets(), ...getCanaryVersionSets()];
}

export function findVersionSet(id) {
  return getAllVersionSets().find((versionSet) => versionSet.id === id);
}

function normalizeVersionSet(versionSet) {
  return {
    ...versionSet,
    mode: versionSet.mode ?? 'latest',
  };
}

function assertVersionSets(versionSets, { allowDistTag }) {
  const seenIds = new Set();
  for (const versionSet of versionSets) {
    if (!versionSet.id || typeof versionSet.id !== 'string') {
      throw new Error('Every Angular compatibility version set needs an id');
    }

    if (seenIds.has(versionSet.id)) {
      throw new Error(
        `Duplicate Angular compatibility version set ${versionSet.id}`,
      );
    }
    seenIds.add(versionSet.id);

    if (versionSet.mode === 'dist-tag') {
      if (!allowDistTag) {
        throw new Error(
          `${versionSet.id} cannot use dist-tag mode in the required consumer matrix`,
        );
      }
      if (!versionSet.npmTag) {
        throw new Error(
          `${versionSet.id} uses dist-tag mode but does not define npmTag`,
        );
      }
      continue;
    }

    if (!['floor', 'latest'].includes(versionSet.mode)) {
      throw new Error(
        `${versionSet.id} uses unsupported mode ${versionSet.mode}`,
      );
    }

    if (!Number.isInteger(versionSet.angularMajor)) {
      throw new Error(`${versionSet.id} must define an integer angularMajor`);
    }
  }
}

function assertUniqueVersionSetIds(versionSets) {
  const seenIds = new Set();
  for (const versionSet of versionSets) {
    if (seenIds.has(versionSet.id)) {
      throw new Error(
        `Angular compatibility version set id ${versionSet.id} is configured more than once`,
      );
    }
    seenIds.add(versionSet.id);
  }
}

export function resolveNpmJson(spec, field) {
  const output = capture('pnpm', ['view', spec, field, '--json']);
  return JSON.parse(output);
}

export function resolveLatestVersion(spec) {
  const version = resolveNpmJson(spec, 'version');
  if (Array.isArray(version)) {
    return version.at(-1);
  }

  return version;
}

export function resolveLatestSatisfying(packageName, range) {
  const versions = resolveNpmJson(packageName, 'versions');
  const version = semver.maxSatisfying(versions, range);
  if (!version) {
    throw new Error(`Could not resolve ${packageName} satisfying ${range}`);
  }

  return version;
}

export function resolveAngularToolchain(versionSetOrMajor, options = {}) {
  const versionSet =
    typeof versionSetOrMajor === 'number'
      ? {
          id: `angular-${versionSetOrMajor}-latest`,
          angularMajor: versionSetOrMajor,
          mode: 'latest',
        }
      : normalizeVersionSet(versionSetOrMajor);
  const angularVersion = resolveAngularVersion(versionSet);
  const angularMajor = semver.major(angularVersion);
  const compilerCliVersion = resolveAngularPackageVersion(
    '@angular/compiler-cli',
    versionSet,
    angularVersion,
  );
  const compilerCliPeers = resolveNpmJson(
    `@angular/compiler-cli@${compilerCliVersion}`,
    'peerDependencies',
  );
  const corePeers = resolveNpmJson(
    `@angular/core@${angularVersion}`,
    'peerDependencies',
  );
  const angularBuildVersion = options.includeCli
    ? resolveAngularPackageVersion('@angular/build', versionSet, angularVersion)
    : undefined;
  const angularBuildPeers = angularBuildVersion
    ? resolveNpmJson(
        `@angular/build@${angularBuildVersion}`,
        'peerDependencies',
      )
    : undefined;
  const cliVersion = options.includeCli
    ? resolveAngularPackageVersion('@angular/cli', versionSet)
    : undefined;
  const ngPackagrVersion = options.includeNgPackagr
    ? resolveAngularPackageVersion('ng-packagr', versionSet)
    : undefined;
  const ngPackagrPeers = ngPackagrVersion
    ? resolveNpmJson(`ng-packagr@${ngPackagrVersion}`, 'peerDependencies')
    : undefined;
  const typescriptRange = [
    compilerCliPeers.typescript,
    angularBuildPeers?.typescript,
    ngPackagrPeers?.typescript,
  ]
    .filter(Boolean)
    .join(' ');
  const typescriptVersion = resolveLatestSatisfying(
    'typescript',
    typescriptRange,
  );
  const zoneVersion = corePeers['zone.js']
    ? resolveLatestSatisfying('zone.js', corePeers['zone.js'])
    : undefined;

  return {
    id: versionSet.id,
    label: getVersionSetLabel(versionSet),
    angularMajor,
    angularVersion,
    compilerCliVersion,
    angularBuildVersion,
    cliVersion,
    ngPackagrVersion,
    typescriptVersion,
    zoneVersion,
  };
}

function resolveAngularVersion(versionSet) {
  if (versionSet.mode === 'dist-tag') {
    return resolveLatestVersion(`@angular/core@${versionSet.npmTag}`);
  }

  return resolveAngularPackageVersion('@angular/core', versionSet);
}

function resolveAngularPackageVersion(
  packageName,
  versionSet,
  exactAngularVersion,
) {
  if (
    exactAngularVersion &&
    packageName.startsWith('@angular/') &&
    packageName !== '@angular/cli'
  ) {
    return exactAngularVersion;
  }

  if (versionSet.mode === 'dist-tag') {
    return resolveLatestVersion(`${packageName}@${versionSet.npmTag}`);
  }

  if (versionSet.mode === 'floor') {
    return resolveLatestSatisfying(
      packageName,
      `>=${versionSet.angularMajor}.0.0 <${versionSet.angularMajor}.1.0`,
    );
  }

  return resolveLatestVersion(`${packageName}@${versionSet.angularMajor}`);
}

export function getVersionSetLabel(versionSet) {
  if (versionSet.mode === 'dist-tag') {
    return `${versionSet.npmTag} dist-tag`;
  }

  return `Angular ${versionSet.angularMajor} ${versionSet.mode}`;
}

export function findTarballs(path = artifactDir) {
  if (!existsSync(path)) {
    return [];
  }

  return readdirSync(path)
    .filter((file) => file.endsWith('.tgz'))
    .map((file) => resolve(path, file));
}

export function resolveTarball(explicitTarball) {
  if (explicitTarball) {
    return resolve(workspaceRoot, explicitTarball);
  }

  const tarballs = findTarballs();
  if (tarballs.length !== 1) {
    throw new Error(
      `Expected exactly one compatibility tarball in ${config.artifactDir}, found ${tarballs.length}`,
    );
  }

  return tarballs[0];
}

export function assertTarballIntegrity(tarballPath = resolveTarball()) {
  const sourcePackageJson = readPackageJson();
  const files = new Set(
    capture('tar', ['-tzf', tarballPath]).split('\n').filter(Boolean),
  );
  const packageJson = JSON.parse(
    captureBuffer('tar', [
      '-xOf',
      tarballPath,
      'package/package.json',
    ]).toString('utf8'),
  );

  if (packageJson.name !== config.packageName) {
    throw new Error(
      `Packed artifact name ${packageJson.name} does not match ${config.packageName}`,
    );
  }

  if (packageJson.version !== sourcePackageJson.version) {
    throw new Error(
      `Packed artifact version ${packageJson.version} does not match source package version ${sourcePackageJson.version}`,
    );
  }

  if (packageJson.private) {
    throw new Error('Packed artifact must not be private');
  }

  if (packageJson.scripts) {
    throw new Error('Packed artifact must not include package scripts');
  }

  if (packageJson.devDependencies) {
    throw new Error('Packed artifact must not include devDependencies');
  }

  if (packageJson.type !== 'module') {
    throw new Error(
      `Packed artifact type must be module, found ${packageJson.type}`,
    );
  }

  if (packageJson.sideEffects !== false) {
    throw new Error('Packed artifact must preserve sideEffects: false');
  }

  assertNoWorkspaceReferences(packageJson.dependencies, 'dependencies');
  assertNoWorkspaceReferences(packageJson.peerDependencies, 'peerDependencies');
  assertNoWorkspaceReferences(
    packageJson.optionalDependencies,
    'optionalDependencies',
  );

  assertEntrypointExports(packageJson, files);
  assertNoSourceOnlyFiles(files);

  console.log(`Packed artifact is valid: ${tarballPath}`);
  return { packageJson, files };
}

function assertNoWorkspaceReferences(dependencies, field) {
  for (const [dependency, range] of Object.entries(dependencies ?? {})) {
    if (/^(workspace|file|link|portal):/.test(range)) {
      throw new Error(
        `Packed artifact ${field}.${dependency} contains local reference ${range}`,
      );
    }
  }
}

function assertEntrypointExports(packageJson, files) {
  const expectedExportKeys = [
    './package.json',
    ...config.entrypoints.map(getEntrypointExportKey),
  ].sort();
  const actualExportKeys = Object.keys(packageJson.exports ?? {}).sort();

  if (JSON.stringify(actualExportKeys) !== JSON.stringify(expectedExportKeys)) {
    throw new Error(
      `Packed artifact exports ${JSON.stringify(actualExportKeys)} do not match configured entrypoints ${JSON.stringify(expectedExportKeys)}`,
    );
  }

  for (const entrypoint of config.entrypoints) {
    const exportKey = getEntrypointExportKey(entrypoint);
    const exported = packageJson.exports[exportKey];
    if (!exported?.types || !exported?.default) {
      throw new Error(
        `Packed artifact export ${exportKey} must define types and default`,
      );
    }

    assertTarballFile(files, exported.types, `${entrypoint} types`);
    assertTarballFile(files, exported.default, `${entrypoint} FESM bundle`);
  }

  assertTarballFile(files, './package.json', 'package.json export');
}

function getEntrypointExportKey(entrypoint) {
  if (entrypoint === config.packageName) {
    return '.';
  }

  return `.${entrypoint.slice(config.packageName.length)}`;
}

function assertTarballFile(files, exportPath, label) {
  const normalizedPath = exportPath.replace(/^\.\//, '');
  const tarballPath = `package/${normalizedPath}`;
  if (!files.has(tarballPath)) {
    throw new Error(`Packed artifact is missing ${label}: ${tarballPath}`);
  }
}

function assertNoSourceOnlyFiles(files) {
  for (const file of files) {
    if (file.includes('/node_modules/')) {
      throw new Error(
        `Packed artifact must not include node_modules file ${file}`,
      );
    }

    if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      throw new Error(
        `Packed artifact must not include TypeScript source file ${file}`,
      );
    }
  }
}

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

import {
  assertTarballIntegrity,
  assertCompatibilityConfig,
  cleanupWorkspace,
  config,
  createWorkspace,
  findVersionSet,
  packageRoot,
  readPackageJson,
  readJson,
  resolveAngularToolchain,
  resolveTarball,
  run,
  writePnpmWorkspaceConfig,
  writeJson,
  workspaceRoot,
} from './lib.mjs';

export function testConsumers(options = {}) {
  const result = assertCompatibilityConfig();
  const versionSets = resolveRequestedVersionSets(options, result);
  const tarball = resolveTarball(options.tarball);

  if (options.metadataOut && versionSets.length !== 1) {
    throw new Error('--metadata-out can only be used with one version set');
  }

  assertTarballIntegrity(tarball);

  for (const versionSet of versionSets) {
    testConsumer(versionSet, tarball, options);
  }
}

function testConsumer(versionSet, tarballPath, options) {
  const packageJson = readPackageJson();
  const toolchain = resolveAngularToolchain(versionSet, { includeCli: true });
  const workspace = createWorkspace(
    `limitless-angular-compat-consumer-${versionSet.id}-`,
  );

  try {
    writeConsumerMetadata(options.metadataOut, { versionSet, toolchain });

    writeConsumerProject(workspace, {
      versionSet,
      packageJson,
      tarballPath,
      toolchain,
    });

    console.log(
      `Testing ${config.packageName} artifact in ${toolchain.label} consumer with Angular ${toolchain.angularVersion}, CLI ${toolchain.cliVersion}, TypeScript ${toolchain.typescriptVersion}.`,
    );
    run('pnpm', ['install', '--no-frozen-lockfile'], { cwd: workspace });
    run('pnpm', ['run', 'build'], { cwd: workspace });
    if (!options.skipRuntime) {
      installPlaywrightBrowserIfNeeded(workspace);
      run('pnpm', ['run', 'runtime:smoke'], { cwd: workspace });
    }
  } finally {
    cleanupWorkspace(workspace);
  }
}

function writeConsumerMetadata(metadataOut, { versionSet, toolchain }) {
  if (!metadataOut) {
    return;
  }

  const outPath = resolve(workspaceRoot, metadataOut);
  mkdirSync(dirname(outPath), { recursive: true });
  writeJson(outPath, {
    id: versionSet.id,
    label: toolchain.label,
    testedVersions: {
      angular: toolchain.angularVersion,
      cli: toolchain.cliVersion,
      typescript: toolchain.typescriptVersion,
    },
  });
}

function writeConsumerProject(
  workspace,
  { versionSet, packageJson, tarballPath, toolchain },
) {
  const tarballDependency = `file:${tarballPath}`;
  const packageName = `sanity-${versionSet.id}-compat-consumer`;
  const runtimePort = getRuntimePort(versionSet.id);
  const sharedSanityDeps = {
    '@portabletext/toolkit': getPublishedDependencyRange(
      packageJson,
      '@portabletext/toolkit',
    ),
    '@portabletext/types': getPublishedDependencyRange(
      packageJson,
      '@portabletext/types',
    ),
    '@sanity/client': getPublishedDependencyRange(
      packageJson,
      '@sanity/client',
    ),
    '@sanity/image-url': getPublishedDependencyRange(
      packageJson,
      '@sanity/image-url',
    ),
    rxjs: packageJson.peerDependencies.rxjs,
    tslib: packageJson.dependencies.tslib,
  };

  writePnpmWorkspaceConfig(workspace, ['.']);

  writeJson(join(workspace, 'package.json'), {
    name: packageName,
    private: true,
    type: 'module',
    scripts: {
      build: 'ng build --configuration production',
      'runtime:smoke': 'node runtime-smoke.mjs',
    },
    dependencies: {
      '@angular/common': toolchain.angularVersion,
      '@angular/compiler': toolchain.angularVersion,
      '@angular/core': toolchain.angularVersion,
      '@angular/platform-browser': toolchain.angularVersion,
      '@angular/router': toolchain.angularVersion,
      [config.packageName]: tarballDependency,
      ...sharedSanityDeps,
    },
    devDependencies: {
      '@angular/build': toolchain.angularBuildVersion,
      '@angular/cli': toolchain.cliVersion,
      '@angular/compiler-cli': toolchain.compilerCliVersion,
      '@playwright/test': readPlaywrightVersion(),
      '@types/node': packageJson.devDependencies['@types/node'],
      typescript: toolchain.typescriptVersion,
    },
  });

  writeJson(join(workspace, 'angular.json'), {
    $schema: './node_modules/@angular/cli/lib/config/schema.json',
    version: 1,
    newProjectRoot: 'projects',
    projects: {
      [packageName]: {
        projectType: 'application',
        root: '',
        sourceRoot: 'src',
        prefix: 'app',
        architect: {
          build: {
            builder: '@angular/build:application',
            options: {
              outputPath: `dist/${packageName}`,
              index: 'src/index.html',
              browser: 'src/main.ts',
              polyfills: [],
              tsConfig: 'tsconfig.app.json',
              inlineStyleLanguage: 'css',
              assets: [],
              styles: ['src/styles.css'],
              scripts: [],
            },
            configurations: {
              production: {
                outputHashing: 'all',
              },
            },
            defaultConfiguration: 'production',
          },
        },
      },
    },
    cli: {
      analytics: false,
    },
  });

  writeJson(join(workspace, 'tsconfig.json'), {
    compileOnSave: false,
    compilerOptions: {
      forceConsistentCasingInFileNames: true,
      importHelpers: true,
      lib: ['esnext', 'dom'],
      module: 'esnext',
      moduleResolution: 'bundler',
      noFallthroughCasesInSwitch: true,
      noImplicitOverride: true,
      noImplicitReturns: true,
      noPropertyAccessFromIndexSignature: true,
      skipLibCheck: true,
      strict: true,
      target: 'es2022',
      useDefineForClassFields: false,
    },
    angularCompilerOptions: {
      enableI18nLegacyMessageIdFormat: false,
      strictInjectionParameters: true,
      strictInputAccessModifiers: true,
      typeCheckHostBindings: true,
      strictTemplates: true,
    },
  });

  writeJson(join(workspace, 'tsconfig.app.json'), {
    extends: './tsconfig.json',
    compilerOptions: {
      outDir: './out-tsc/app',
      types: ['node'],
    },
    files: ['src/main.ts', 'src/entrypoints.ts', 'src/api-types.ts'],
    include: ['src/**/*.d.ts'],
  });

  mkdirSync(join(workspace, 'src'), { recursive: true });
  writeFileSync(
    join(workspace, 'src/index.html'),
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>${packageName}</title>
    <base href="/">
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body>
    <app-root></app-root>
  </body>
</html>
`,
  );
  writeFileSync(join(workspace, 'src/styles.css'), '');
  writeFileSync(join(workspace, 'src/entrypoints.ts'), entrypointsSource());
  writeFileSync(join(workspace, 'src/api-types.ts'), apiTypesSource());
  writeFileSync(join(workspace, 'src/main.ts'), consumerMainSource(toolchain));
  writeFileSync(
    join(workspace, 'runtime-server.mjs'),
    runtimeServerSource(packageName, runtimePort),
  );
  writeFileSync(
    join(workspace, 'runtime-smoke.mjs'),
    runtimeSmokeSource(runtimePort),
  );

  console.log(`Consumer workspace: ${relative(workspaceRoot, workspace)}`);
}

function getPublishedDependencyRange(packageJson, dependencyName) {
  const range =
    packageJson.dependencies?.[dependencyName] ??
    packageJson.peerDependencies?.[dependencyName];

  if (!range) {
    throw new Error(
      `Expected ${dependencyName} in dependencies or peerDependencies.`,
    );
  }

  return range;
}

function entrypointsSource() {
  return config.entrypoints
    .map(
      (entrypoint, index) =>
        `import * as entrypoint${index} from '${entrypoint}';\nvoid entrypoint${index};\n`,
    )
    .join('\n');
}

function consumerMainSource(toolchain) {
  const zonelessProvider =
    toolchain.angularMajor >= 20
      ? 'provideZonelessChangeDetection'
      : 'provideExperimentalZonelessChangeDetection';
  const coreImports = ['Component', zonelessProvider];
  const browserGlobalErrorProvider =
    toolchain.angularMajor >= 20
      ? '\n    provideBrowserGlobalErrorListeners(),'
      : '';

  if (toolchain.angularMajor >= 20) {
    coreImports.push('provideBrowserGlobalErrorListeners');
  }

  return `import { ${coreImports.join(', ')} } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

import { provideSanity } from '@limitless-angular/sanity';
import { SanityImage, provideSanityLoader } from '@limitless-angular/sanity/image-loader';
import {
  PortableTextComponent,
  type PortableTextComponents,
  toPlainText,
} from '@limitless-angular/sanity/portabletext';
import { LiveQueryProviderComponent } from '@limitless-angular/sanity/preview-kit';
import {
  VisualEditingComponent,
  VisualEditingInsertMenuComponent,
  VisualEditingPointerEventsComponent,
  VisualEditingUnionInsertMenuOverlayComponent,
  type ElementNode,
  type OverlayElementParent,
  type SanityNode,
  type SchemaNode,
  type SchemaUnionNode,
} from '@limitless-angular/sanity/visual-editing';

const blocks = [
  {
    _type: 'block',
    _key: 'compat-block',
    style: 'normal',
    markDefs: [],
    children: [{ _type: 'span', _key: 'compat-span', text: 'Angular compatibility' }],
  },
];

const sanityConfig = {
  projectId: 'compatproject',
  dataset: 'production',
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    PortableTextComponent,
    SanityImage,
    LiveQueryProviderComponent,
    VisualEditingComponent,
    VisualEditingInsertMenuComponent,
    VisualEditingPointerEventsComponent,
    VisualEditingUnionInsertMenuOverlayComponent,
  ],
  template: \`
    <p data-testid="compat-marker">{{ plainText }}</p>
    <article
      data-testid="portable-text"
      portable-text
      [value]="blocks"
      [components]="components"
    ></article>
    <img
      data-testid="compat-image"
      alt="Compatibility"
      width="120"
      height="80"
      ngSrc="image-abc123-120x80-png"
      [sanityImage]="image"
      priority
    />
    <ng-template>
      <live-query-provider />
      <visual-editing />
      <sanity-visual-editing-insert-menu [node]="insertMenuNode" />
      <sanity-visual-editing-pointer-events />
      <sanity-visual-editing-union-insert-menu-overlay
        [element]="overlayElement"
        [node]="overlayNode"
        [parent]="overlayParent"
      />
    </ng-template>
  \`,
})
class AppComponent {
  protected readonly blocks = blocks;
  protected readonly components: Partial<PortableTextComponents> = {};
  protected readonly image = 'image-abc123-120x80-png';
  protected readonly insertMenuNode = {} as SchemaUnionNode<SchemaNode>;
  protected readonly overlayElement = {} as ElementNode;
  protected readonly overlayNode = {} as SanityNode;
  protected readonly overlayParent = this.insertMenuNode as OverlayElementParent;
  protected readonly plainText = toPlainText(blocks);
}

bootstrapApplication(AppComponent, {
  providers: [
    ${zonelessProvider}(),${browserGlobalErrorProvider}
    provideSanity(sanityConfig),
    provideSanityLoader(sanityConfig),
  ],
}).catch((error) => console.error(error));
`;
}

function apiTypesSource() {
  return `import type {
  EnvironmentProviders,
  InjectionToken,
  Provider,
  Signal,
  Type,
} from '@angular/core';
import { provideSanity, withLivePreview } from '@limitless-angular/sanity';
import {
  SanityImage,
  provideSanityLoader,
} from '@limitless-angular/sanity/image-loader';
import {
  PortableTextComponent,
  PortableTextMarkComponent,
  PortableTextTypeComponent,
  type PortableTextBlock,
  type PortableTextComponents,
  toPlainText,
} from '@limitless-angular/sanity/portabletext';
import {
  createLiveData,
  LiveQueryProviderComponent,
} from '@limitless-angular/sanity/preview-kit';
import {
  SANITY_CONFIG,
  type SanityClientFactory,
  type SanityConfig,
} from '@limitless-angular/sanity/shared';
import { VisualEditingComponent } from '@limitless-angular/sanity/visual-editing';
import { createClient } from '@sanity/client';

const sanityConfig: SanityConfig = {
  projectId: 'compatproject',
  dataset: 'production',
};
const sanityClientFactory: SanityClientFactory = (preview) =>
  createClient({
    ...sanityConfig,
    apiVersion: '2025-01-01',
    useCdn: !preview?.token,
    token: preview?.token,
    perspective: preview?.token ? 'drafts' : 'published',
    ignoreBrowserTokenWarning: true,
  });

const providers: EnvironmentProviders = provideSanity(
  sanityClientFactory,
  withLivePreview({ refreshInterval: 25 }),
);
const imageLoaderProvider: Provider = provideSanityLoader(sanityConfig);
const configToken: InjectionToken<SanityConfig> = SANITY_CONFIG;
const imageDirective: Type<SanityImage> = SanityImage;
const portableTextComponent: Type<PortableTextComponent> = PortableTextComponent;
const liveQueryProvider: Type<LiveQueryProviderComponent> = LiveQueryProviderComponent;
const visualEditingComponent: Type<VisualEditingComponent> = VisualEditingComponent;

const blocks: PortableTextBlock[] = [
  {
    _type: 'block',
    _key: 'type-block',
    style: 'normal',
    markDefs: [],
    children: [{ _type: 'span', _key: 'type-span', text: 'Types' }],
  },
];
const components: Partial<PortableTextComponents> = {};
const plainText: string = toPlainText(blocks);

class InlineTypeComponent extends PortableTextTypeComponent<{ _type: 'inline' }> {}
class InlineMarkComponent extends PortableTextMarkComponent {}

const liveData: Signal<{ title: string }> = createLiveData(
  () => ({ title: 'Compatibility' }),
  () => ({ query: '*[_type == "post"][0]' }),
);

void providers;
void sanityClientFactory;
void imageLoaderProvider;
void configToken;
void imageDirective;
void portableTextComponent;
void liveQueryProvider;
void visualEditingComponent;
void components;
void plainText;
void InlineTypeComponent;
void InlineMarkComponent;
void liveData;
`;
}

function runtimeServerSource(packageName, runtimePort) {
  return `import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const outputRoot = resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  'dist/${packageName}',
);
const browserRoot = resolve(outputRoot, 'browser');
const root = await pathExists(browserRoot) ? browserRoot : outputRoot;
const port = ${runtimePort};
const mimeTypes = new Map([
  ['.css', 'text/css'],
  ['.html', 'text/html'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript'],
  ['.json', 'application/json'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
]);

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const requestedPath = decodeURIComponent(url.pathname);
    let filePath = resolve(root, \`.\${requestedPath}\`);

    if (!filePath.startsWith(root)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    try {
      const fileStat = await stat(filePath);
      if (fileStat.isDirectory()) {
        filePath = join(filePath, 'index.html');
      }
    } catch {
      filePath = join(root, 'index.html');
    }

    const body = await readFile(filePath);
    response.writeHead(200, {
      'content-type': mimeTypes.get(extname(filePath)) ?? 'application/octet-stream',
    });
    response.end(body);
  } catch (error) {
    response.writeHead(500);
    response.end(String(error));
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(\`Serving compatibility consumer at http://127.0.0.1:\${port}\`);
});

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
`;
}

function runtimeSmokeSource(runtimePort) {
  return `import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

import { chromium } from '@playwright/test';

const runtimeUrl = 'http://127.0.0.1:${runtimePort}';
const runtimeTimeout = 90_000;
const serverStartupTimeout = 30_000;
const browserTimeout = 30_000;
const assertionTimeout = 15_000;
const server = spawn(process.execPath, ['runtime-server.mjs'], {
  stdio: ['ignore', 'inherit', 'inherit'],
});
let serverExit = null;

server.once('exit', (code, signal) => {
  serverExit = { code, signal };
});

try {
  await withTimeout(
    (async () => {
      await waitForServer(runtimeUrl, serverStartupTimeout);
      await runSmoke(runtimeUrl);
    })(),
    runtimeTimeout,
    'complete compatibility runtime smoke',
  );
} finally {
  await stopServer(server);
}

async function runSmoke(url) {
  let browser;
  let page;
  const consoleErrors = [];
  const pageErrors = [];

  try {
    browser = await withTimeout(
      chromium.launch(),
      browserTimeout,
      'launch Chromium',
    );
    page = await browser.newPage();
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto(url, { timeout: browserTimeout, waitUntil: 'load' });

    assert.equal(
      await page
        .getByTestId('compat-marker')
        .textContent({ timeout: assertionTimeout }),
      'Angular compatibility',
    );
    assert.match(
      await page
        .getByTestId('portable-text')
        .textContent({ timeout: assertionTimeout }),
      /Angular compatibility/,
    );

    const image = page.getByTestId('compat-image');
    await image.waitFor({ state: 'visible', timeout: assertionTimeout });
    assert.match(
      (await image.getAttribute('src', { timeout: assertionTimeout })) ?? '',
      /cdn\\.sanity\\.io\\/images\\/compatproject\\/production\\/abc123-120x80\\.png/,
    );

    await page.waitForTimeout(250);
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(consoleErrors, []);
    console.log(
      'Angular compatibility',
      'runtime smoke passed at',
      url,
    );
  } catch (error) {
    if (page) {
      console.error(
        'Compatibility smoke body:',
        await page.locator('body').innerHTML(),
      );
    }
    console.error(
      'Compatibility smoke console errors:',
      JSON.stringify(consoleErrors, null, 2),
    );
    console.error(
      'Compatibility smoke page errors:',
      JSON.stringify(pageErrors, null, 2),
    );
    throw error;
  } finally {
    await browser?.close();
  }
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    assertServerRunning();

    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      lastError = new Error(\`Server responded with \${response.status}\`);
    } catch (error) {
      lastError = error;
    }

    await delay(250);
  }

  throw new Error(
    \`Timed out waiting for compatibility runtime server at \${url}: \${lastError}\`,
  );
}

function assertServerRunning() {
  if (serverExit) {
    throw new Error(
      \`Compatibility runtime server exited early with code \${serverExit.code} and signal \${serverExit.signal}\`,
    );
  }
}

function withTimeout(promise, timeoutMs, label) {
  let timer;

  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(\`Timed out while trying to \${label}\`)),
        timeoutMs,
      );
    }),
  ]).finally(() => clearTimeout(timer));
}

async function stopServer(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  child.kill('SIGTERM');
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve();
    }, 5_000);

    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}
`;
}

function resolveRequestedVersionSets(options, result) {
  if (options.set) {
    const versionSet = findVersionSet(options.set);
    if (!versionSet) {
      throw new Error(
        `Unknown Angular compatibility version set ${options.set}`,
      );
    }

    return [versionSet];
  }

  if (options.angular) {
    const angularMajor = Number(options.angular);
    const versionSet = result.consumerVersionSets.find(
      (candidate) =>
        candidate.angularMajor === angularMajor && candidate.mode === 'latest',
    );
    if (!versionSet) {
      throw new Error(
        `No latest Angular ${angularMajor} compatibility version set is configured`,
      );
    }

    return [versionSet];
  }

  return result.consumerVersionSets;
}

function readPlaywrightVersion() {
  const packageJson = readJson(new URL('./package.json', import.meta.url));
  return packageJson.devDependencies['@playwright/test'];
}

function installPlaywrightBrowserIfNeeded(workspace) {
  const browserPath = process.env['PLAYWRIGHT_BROWSERS_PATH'];

  if (browserPath && browserPath !== '0') {
    console.log(
      `Using preinstalled Playwright browsers from ${browserPath}; skipping browser download.`,
    );
    return;
  }

  run('pnpm', ['exec', 'playwright', 'install', 'chromium'], {
    cwd: workspace,
  });
}

function getRuntimePort(id) {
  const offset = [...id].reduce(
    (value, character) => value + character.charCodeAt(0),
    0,
  );
  return 4300 + (offset % 1000);
}

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import {
  assertTarballIntegrity,
  assertCompatibilityConfig,
  cleanupWorkspace,
  config,
  createWorkspace,
  findVersionSet,
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
      run('pnpm', ['exec', 'playwright', 'install', 'chromium'], {
        cwd: workspace,
      });
      run('pnpm', ['run', 'runtime:smoke'], { cwd: workspace });
    }
  } finally {
    cleanupWorkspace(workspace);
  }
}

function writeConsumerProject(
  workspace,
  { versionSet, packageJson, tarballPath, toolchain },
) {
  const tarballDependency = `file:${tarballPath}`;
  const packageName = `sanity-${versionSet.id}-compat-consumer`;
  const runtimePort = getRuntimePort(versionSet.id);
  const sharedSanityDeps = {
    '@portabletext/toolkit':
      packageJson.peerDependencies['@portabletext/toolkit'],
    '@portabletext/types': packageJson.peerDependencies['@portabletext/types'],
    '@sanity/client': packageJson.peerDependencies['@sanity/client'],
    '@sanity/comlink': '^1.1.2',
    '@sanity/image-url': packageJson.peerDependencies['@sanity/image-url'],
    '@sanity/types': '^3.64.1',
    '@sanity/visual-editing':
      packageJson.peerDependencies['@sanity/visual-editing'],
    rxjs: packageJson.peerDependencies.rxjs,
    tslib: packageJson.dependencies.tslib,
    'zone.js': toolchain.zoneVersion,
  };

  writePnpmWorkspaceConfig(workspace, ['.']);

  writeJson(join(workspace, 'package.json'), {
    name: packageName,
    private: true,
    type: 'module',
    scripts: {
      build: 'ng build --configuration production',
      'runtime:smoke': 'playwright test --config playwright.config.mjs',
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
      '@angular-devkit/build-angular': toolchain.buildAngularVersion,
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
            builder: '@angular-devkit/build-angular:application',
            options: {
              outputPath: `dist/${packageName}`,
              index: 'src/index.html',
              browser: 'src/main.ts',
              polyfills: ['zone.js'],
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
      baseUrl: './',
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
  writeFileSync(join(workspace, 'src/main.ts'), consumerMainSource());
  writeFileSync(
    join(workspace, 'runtime-server.mjs'),
    runtimeServerSource(packageName, runtimePort),
  );
  mkdirSync(join(workspace, 'tests'), { recursive: true });
  writeFileSync(
    join(workspace, 'playwright.config.mjs'),
    playwrightConfigSource(runtimePort),
  );
  writeFileSync(
    join(workspace, 'tests/runtime-smoke.spec.mjs'),
    runtimeSmokeSource(),
  );

  console.log(`Consumer workspace: ${relative(workspaceRoot, workspace)}`);
}

function entrypointsSource() {
  return config.entrypoints
    .map(
      (entrypoint, index) =>
        `import * as entrypoint${index} from '${entrypoint}';\nvoid entrypoint${index};\n`,
    )
    .join('\n');
}

function consumerMainSource() {
  return `import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

import { provideSanity } from '@limitless-angular/sanity';
import { SanityImage, provideSanityLoader } from '@limitless-angular/sanity/image-loader';
import {
  PortableTextComponent,
  type PortableTextComponents,
  toPlainText,
} from '@limitless-angular/sanity/portabletext';

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
  imports: [PortableTextComponent, SanityImage],
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
  \`,
})
class AppComponent {
  protected readonly blocks = blocks;
  protected readonly components: Partial<PortableTextComponents> = {};
  protected readonly image = 'image-abc123-120x80-png';
  protected readonly plainText = toPlainText(blocks);
}

bootstrapApplication(AppComponent, {
  providers: [
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
import { UseDocumentsInUseService } from '@limitless-angular/sanity/preview-kit-compat';
import {
  SANITY_CONFIG,
  type SanityClientFactory,
  type SanityConfig,
} from '@limitless-angular/sanity/shared';
import { VisualEditingComponent } from '@limitless-angular/sanity/visual-editing';
import type {
  HistoryUpdate,
  VisualEditingControllerMsg,
} from '@limitless-angular/sanity/visual-editing-helpers';
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
    perspective: preview?.token ? 'previewDrafts' : 'published',
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
const documentsService: Type<UseDocumentsInUseService> = UseDocumentsInUseService;

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
const historyUpdate: HistoryUpdate = {
  type: 'push',
  url: '/compat',
};
const controllerMessage: VisualEditingControllerMsg = {
  type: 'presentation/navigate',
  data: historyUpdate,
};

void providers;
void sanityClientFactory;
void imageLoaderProvider;
void configToken;
void imageDirective;
void portableTextComponent;
void liveQueryProvider;
void visualEditingComponent;
void documentsService;
void components;
void plainText;
void InlineTypeComponent;
void InlineMarkComponent;
void liveData;
void controllerMessage;
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

function playwrightConfigSource(runtimePort) {
  return `export default {
  testDir: './tests',
  timeout: 60_000,
  webServer: {
    command: 'node runtime-server.mjs',
    url: 'http://127.0.0.1:${runtimePort}',
    reuseExistingServer: false,
    timeout: 30_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:${runtimePort}',
    browserName: 'chromium',
  },
};
`;
}

function runtimeSmokeSource() {
  return `import { expect, test } from '@playwright/test';

test('boots the packaged Angular compatibility consumer', async ({ page }) => {
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');

  try {
    await expect(page.getByTestId('compat-marker')).toHaveText(
      'Angular compatibility',
    );
    await expect(page.getByTestId('portable-text')).toContainText(
      'Angular compatibility',
    );

    const image = page.getByTestId('compat-image');
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute(
      'src',
      /cdn\\.sanity\\.io\\/images\\/compatproject\\/production\\/abc123-120x80\\.png/,
    );

    await page.waitForTimeout(250);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  } catch (error) {
    console.error('Compatibility smoke body:', await page.locator('body').innerHTML());
    console.error('Compatibility smoke console errors:', JSON.stringify(consoleErrors, null, 2));
    console.error('Compatibility smoke page errors:', JSON.stringify(pageErrors, null, 2));
    throw error;
  }
});
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
  const packageJson = readJson(
    join(workspaceRoot, 'apps/sanity-presentation-e2e/package.json'),
  );
  return packageJson.devDependencies['@playwright/test'];
}

function getRuntimePort(id) {
  const offset = [...id].reduce(
    (value, character) => value + character.charCodeAt(0),
    0,
  );
  return 4300 + (offset % 1000);
}

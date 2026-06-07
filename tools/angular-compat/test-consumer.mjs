import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import {
  assertCompatibilityConfig,
  cleanupWorkspace,
  config,
  createWorkspace,
  readPackageJson,
  resolveAngularToolchain,
  resolveTarball,
  run,
  writePnpmWorkspaceConfig,
  writeJson,
  workspaceRoot,
} from './lib.mjs';

const options = parseArgs(process.argv.slice(2));
const result = assertCompatibilityConfig();
const majors = options.angular
  ? [Number(options.angular)]
  : result.consumerAngularMajors;
const tarball = resolveTarball(options.tarball);

for (const major of majors) {
  if (!result.consumerAngularMajors.includes(major)) {
    throw new Error(
      `Angular ${major} is not configured for ${config.packageName}`,
    );
  }

  testConsumer(major, tarball);
}

function testConsumer(major, tarballPath) {
  const packageJson = readPackageJson();
  const toolchain = resolveAngularToolchain(major, { includeCli: true });
  const workspace = createWorkspace(
    `limitless-angular-compat-consumer-${major}-`,
  );

  try {
    writeConsumerProject(workspace, {
      major,
      packageJson,
      tarballPath,
      toolchain,
    });

    console.log(
      `Testing ${config.packageName} artifact in Angular ${major} consumer with Angular ${toolchain.angularVersion}, CLI ${toolchain.cliVersion}, TypeScript ${toolchain.typescriptVersion}.`,
    );
    run('pnpm', ['install', '--no-frozen-lockfile'], { cwd: workspace });
    run('pnpm', ['run', 'build'], { cwd: workspace });
  } finally {
    cleanupWorkspace(workspace);
  }
}

function writeConsumerProject(
  workspace,
  { major, packageJson, tarballPath, toolchain },
) {
  const tarballDependency = `file:${tarballPath}`;
  const packageName = `sanity-angular-${major}-compat-consumer`;
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
      '@angular/compiler-cli': toolchain.angularVersion,
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
    files: ['src/main.ts', 'src/entrypoints.ts'],
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
  writeFileSync(join(workspace, 'src/main.ts'), consumerMainSource());

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
import { provideRouter, RouterOutlet } from '@angular/router';

import { provideSanity, withLivePreview } from '@limitless-angular/sanity';
import { SanityImage, provideSanityLoader } from '@limitless-angular/sanity/image-loader';
import {
  PortableTextComponent,
  type PortableTextComponents,
  toPlainText,
} from '@limitless-angular/sanity/portabletext';
import {
  createLiveData,
  LiveQueryProviderComponent,
  LIVE_PREVIEW_REFRESH_INTERVAL,
} from '@limitless-angular/sanity/preview-kit';
import { UseDocumentsInUseService } from '@limitless-angular/sanity/preview-kit-compat';
import { SANITY_CONFIG } from '@limitless-angular/sanity/shared';
import { VisualEditingComponent } from '@limitless-angular/sanity/visual-editing';
import type { VisualEditingControllerMsg } from '@limitless-angular/sanity/visual-editing-helpers';

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
  projectId: 'compatProject',
  dataset: 'production',
};

const visualEditingMessage: VisualEditingControllerMsg = {
  type: 'presentation/focus',
  data: {
    id: 'compat',
    path: '',
  },
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    LiveQueryProviderComponent,
    PortableTextComponent,
    RouterOutlet,
    SanityImage,
    VisualEditingComponent,
  ],
  template: \`
    <live-query-provider token="compat-token">
      <article
        portable-text
        [value]="blocks"
        [components]="components"
      ></article>
    </live-query-provider>
    <img
      alt="Compatibility"
      width="120"
      height="80"
      ngSrc="image-abc123-120x80-png"
      [sanityImage]="image"
      priority
    />
    <visual-editing />
    <router-outlet />
  \`,
})
class AppComponent {
  protected readonly blocks = blocks;
  protected readonly components: Partial<PortableTextComponents> = {};
  protected readonly image = 'image-abc123-120x80-png';
  protected readonly plainText = toPlainText(blocks);
  protected readonly createLiveData = createLiveData;
  protected readonly visualEditingMessage = visualEditingMessage;
}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter([]),
    provideSanity(sanityConfig, withLivePreview({ refreshInterval: 5 })),
    provideSanityLoader(sanityConfig),
    UseDocumentsInUseService,
    { provide: SANITY_CONFIG, useValue: sanityConfig },
    { provide: LIVE_PREVIEW_REFRESH_INTERVAL, useValue: 5 },
  ],
}).catch((error) => console.error(error));
`;
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--') {
      continue;
    } else if (arg === '--angular') {
      parsed.angular = args[index + 1];
      index += 1;
    } else if (arg === '--tarball') {
      parsed.tarball = args[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument ${arg}`);
    }
  }

  return parsed;
}

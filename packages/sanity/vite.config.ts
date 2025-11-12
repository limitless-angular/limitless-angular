import { globSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

const entryPaths = globSync([
  resolve(import.meta.dirname, 'src/index.ts'),
  resolve(import.meta.dirname, 'src/**/index.ts'),
]);

// Transform array to object with directory names as keys
const entryObject = entryPaths.reduce(
  (acc, filePath) => {
    const relativePath = relative(
      resolve(import.meta.dirname, 'src'),
      filePath,
    );
    const firstDirectoryLevel = relativePath.split('/')[0];
    const dirName =
      firstDirectoryLevel === 'index.ts'
        ? '' // root index.ts
        : firstDirectoryLevel;

    acc[dirName] = filePath;
    return acc;
  },
  {} as Record<string, string>,
);

export default defineConfig(() => ({
  plugins: [angular()],
  resolve: {
    mainFields: ['module'],
  },
  build: {
    target: ['esnext'],
    sourcemap: true,
    lib: {
      entry: entryObject,
      fileName: (_, entryName) =>
        `fesm2022/limitless-angular-sanity${entryName ? `-${entryName}` : ''}.js`,
      formats: ['es'],
    },
    rolldownOptions: {
      external: [/^@angular\/.*/, 'rxjs', 'rxjs/operators'],
      output: {
        preserveModules: false,
      },
    },
    minify: false,
  },
  experimental: {
    enableNativePlugin: true,
  },
}));

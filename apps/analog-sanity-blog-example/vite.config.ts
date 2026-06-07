import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import analog from '@analogjs/platform';
import { defineConfig, loadEnv, splitVendorChunkPlugin } from 'vite';
import webfontDownload from 'vite-plugin-webfont-dl';
import tsconfigPaths from 'vite-tsconfig-paths';
import { typescriptPaths } from 'rollup-plugin-typescript-paths';

const configDir = dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  for (const [key, value] of Object.entries(loadEnv(mode, configDir, ''))) {
    process.env[key] ??= value;
  }

  return {
    root: configDir,
    cacheDir: `../../node_modules/.vite`,

    build: {
      outDir: '../../dist/apps/analog-sanity-blog-example/client',
      reportCompressedSize: true,
      target: ['es2022'],
    },
    plugins: [
      analog({
        nitro: {
          static: false,
          routeRules: {
            '/': { prerender: false, isr: 60 },
            '/sitemap.xml': { isr: 3600 * 24 },
            '/posts/**': { isr: 60 },
          },
          vercel: {
            config: { bypassToken: process.env['BYPASS_TOKEN'] },
          },
          rollupConfig: {
            plugins: [
              typescriptPaths({
                tsConfigPath: resolve(configDir, '../../tsconfig.base.json'),
                preserveExtensions: true,
              }),
            ],
          },
        },
        useAPIMiddleware: false,
      }),
      tsconfigPaths({
        projects: [resolve(configDir, '../../tsconfig.base.json')],
      }),
      splitVendorChunkPlugin(),
      webfontDownload(),
    ],
  };
});

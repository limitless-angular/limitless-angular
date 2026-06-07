import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import analog from '@analogjs/platform';
import { defineConfig, loadEnv } from 'vite';
import webfontDownload from 'vite-plugin-webfont-dl';
import { typescriptPaths } from 'rollup-plugin-typescript-paths';

const configDir = dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  for (const [key, value] of Object.entries(loadEnv(mode, configDir, ''))) {
    process.env[key] ??= value;
  }

  return {
    build: {
      outDir: 'dist/client',
      target: ['es2022'],
    },
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [
      analog({
        nitro: {
          alias: {
            '@/analog-sanity-blog-example/sanity': resolve(
              configDir,
              'src/sanity/lib/index.ts',
            ),
          },
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
      webfontDownload(),
    ],
  };
});

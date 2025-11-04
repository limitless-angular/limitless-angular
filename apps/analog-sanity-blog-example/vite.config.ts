import analog from '@analogjs/platform';
import { defineConfig, splitVendorChunkPlugin } from 'vite';
import webfontDownload from 'vite-plugin-webfont-dl';
import tsconfigPaths from 'vite-tsconfig-paths';
import { typescriptPaths } from 'rollup-plugin-typescript-paths';

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    build: {
      outDir: './dist/client', // TODO: remove this when we can run it through the Angular CLI
      target: ['es2022'],
    },
    resolve: {
      mainFields: ['module'],
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
                tsConfigPath: '../../tsconfig.base.json',
                preserveExtensions: true,
              }),
            ],
          },
        },
        useAPIMiddleware: false,
      }),
      tsconfigPaths(),
      splitVendorChunkPlugin(),
      webfontDownload(),
    ],
  };
});

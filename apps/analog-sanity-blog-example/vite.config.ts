import analog from '@analogjs/platform';
import { defineConfig, splitVendorChunkPlugin } from 'vite';
import webfontDownload from 'vite-plugin-webfont-dl';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { typescriptPaths } from 'rollup-plugin-typescript-paths';

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    root: __dirname,
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
            '/api/sitemap.xml': { isr: 3600 * 24 },
            '/posts/**': { isr: 60 },
          },
          vercel: {
            config: { bypassToken: process.env['BYPASS_TOKEN'] },
          },
          rollupConfig: {
            plugins: [
              typescriptPaths({
                tsConfigPath: 'tsconfig.base.json',
                preserveExtensions: true,
              }),
            ],
          },
        },
        useAPIMiddleware: false,
      }),
      nxViteTsPaths(),
      splitVendorChunkPlugin(),
      webfontDownload(),
    ],
  };
});

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import analog from '@analogjs/platform';
import { defineConfig, loadEnv } from 'vite';
import webfontDownload from 'vite-plugin-webfont-dl';

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
        },
        useAPIMiddleware: false,
      }),
      webfontDownload(),
    ],
  };
});

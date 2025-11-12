import analog from '@analogjs/platform';
import { defineConfig } from 'vite';
import webfontDownload from 'vite-plugin-webfont-dl';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isSSR = process.env.BUILD_SSR === 'true';
  
  return {
    build: {
      target: ['es2020'],
      minify: !isSSR,
    },
    resolve: {
      mainFields: ['module'],
    },
    plugins: [
      tsconfigPaths(),
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

import { defineCliConfig } from 'sanity/cli';

const projectId =
  process.env['SANITY_STUDIO_PROJECT_ID'] ??
  process.env['VITE_SANITY_PROJECT_ID'] ??
  'replace-me';

const dataset =
  process.env['SANITY_STUDIO_DATASET'] ??
  process.env['VITE_SANITY_DATASET'] ??
  'production';

export default defineCliConfig({
  api: {
    projectId,
    dataset,
  },
});

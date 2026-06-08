import { defineConfig } from 'sanity';
import { presentationTool } from 'sanity/presentation';
import { structureTool } from 'sanity/structure';

import { createBlogPresentationConfig } from '@limitless-angular/analog-sanity-blog/presentation';
import { schemaTypes } from '@limitless-angular/analog-sanity-blog/schema';
import { blogStructure } from '@limitless-angular/analog-sanity-blog/structure';

const projectId =
  process.env['SANITY_STUDIO_PROJECT_ID'] ??
  process.env['VITE_SANITY_PROJECT_ID'] ??
  'replace-me';

const dataset =
  process.env['SANITY_STUDIO_DATASET'] ??
  process.env['VITE_SANITY_DATASET'] ??
  'production';

const previewOrigin =
  process.env['SANITY_STUDIO_PREVIEW_ORIGIN'] ?? 'http://localhost:4200';

export default defineConfig({
  name: 'analog-sanity-blog-studio',
  title: 'Analog Sanity Blog Studio',
  projectId,
  dataset,
  plugins: [
    structureTool({ structure: blogStructure }),
    presentationTool(createBlogPresentationConfig({ previewOrigin })),
  ],
  schema: {
    types: schemaTypes,
    templates: (templates) =>
      templates.filter((template) => template.schemaType !== 'settings'),
  },
  document: {
    productionUrl: (previousUrl, context) => {
      const document = context.document;

      if (document?._type === 'settings') {
        return previewOrigin;
      }

      if (document?._type === 'post') {
        const slug = document['slug'];

        if (
          typeof slug === 'object' &&
          slug !== null &&
          'current' in slug &&
          typeof slug.current === 'string'
        ) {
          return `${previewOrigin}/posts/${slug.current}`;
        }
      }

      return previousUrl;
    },
  },
});

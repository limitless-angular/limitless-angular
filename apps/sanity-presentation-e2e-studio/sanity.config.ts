import { defineConfig, defineField, defineType } from 'sanity';
import { presentationTool } from 'sanity/presentation';
import { structureTool } from 'sanity/structure';

const projectId =
  process.env['SANITY_STUDIO_PROJECT_ID'] ?? 'replace-me';

const dataset =
  process.env['SANITY_STUDIO_DATASET'] ?? 'production';

const previewOrigin =
  process.env['SANITY_STUDIO_PREVIEW_ORIGIN'] ?? 'http://localhost:4200';

export default defineConfig({
  name: 'presentation-e2e-studio',
  title: 'Presentation E2E Studio',
  projectId,
  dataset,
  plugins: [
    structureTool(),
    presentationTool({
      previewUrl: {
        origin: previewOrigin,
        preview: '/presentation-smoke',
        previewMode: {
          enable: '/api/draft',
          disable: '/api/draft/disable',
          shareAccess: false,
        },
      },
      resolve: {
        mainDocuments: [
          {
            route: '/presentation-smoke',
            type: 'post',
            filter: '_type == "post" && _id == $id',
            params: { id: 'presentation-smoke-post' },
          },
        ],
        locations: {
          post: {
            select: { title: 'title' },
            resolve: (document) => ({
              locations: [
                {
                  title: document?.title ?? 'Presentation smoke route',
                  href: '/presentation-smoke',
                },
              ],
            }),
          },
        },
      },
    }),
  ],
  schema: {
    types: [
      defineType({
        name: 'post',
        title: 'Post',
        type: 'document',
        fields: [
          defineField({
            name: 'title',
            title: 'Title',
            type: 'string',
          }),
        ],
      }),
    ],
  },
});

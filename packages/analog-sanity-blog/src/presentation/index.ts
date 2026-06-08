export interface BlogPresentationOptions {
  readonly previewOrigin?: string;
}

export function createBlogPresentationConfig({
  previewOrigin = 'http://localhost:4200',
}: BlogPresentationOptions = {}) {
  return {
    previewUrl: {
      origin: previewOrigin,
      preview: '/',
      previewMode: {
        enable: '/api/draft',
        disable: '/api/draft/disable',
        shareAccess: false,
      },
    },
    resolve: {
      mainDocuments: [
        {
          route: '/posts/:slug',
          type: 'post',
          filter: '_type == "post" && slug.current == $slug',
        },
        {
          route: '/',
          type: 'settings',
          filter: '_type == "settings"',
        },
      ],
      locations: {
        post: {
          select: {
            slug: 'slug.current',
            title: 'title',
          },
          resolve: (document: { slug?: string; title?: string } | null) => ({
            locations: document?.slug
              ? [
                  {
                    title: document.title ?? 'Post',
                    href: `/posts/${document.slug}`,
                  },
                ]
              : [],
          }),
        },
        settings: {
          select: {
            title: 'title',
          },
          resolve: (document: { title?: string } | null) => ({
            locations: [
              {
                title: document?.title ?? 'Blog home',
                href: '/',
              },
            ],
          }),
        },
      },
    },
  };
}

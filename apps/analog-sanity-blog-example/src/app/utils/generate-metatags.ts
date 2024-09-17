import type { MetaTag } from '@analogjs/router';

interface ImageMetadata {
  url: string;
  width: number;
  height: number;
  alt: string;
}

interface PageMetadata {
  title: string;
  description: string;
  image?: ImageMetadata;
}

export function generateMetaTags(metadata: PageMetadata): MetaTag[] {
  const { title, description, image } = metadata;

  const metaTags: MetaTag[] = [
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' },
    {
      property: 'twitter:card',
      content: image ? 'summary_large_image' : 'summary',
    },
    { property: 'twitter:title', content: title },
    { property: 'twitter:description', content: description },
  ];

  if (image) {
    metaTags.push(
      { property: 'og:image', content: image.url },
      { property: 'og:image:width', content: image.width.toString() },
      { property: 'og:image:height', content: image.height.toString() },
      { property: 'og:image:alt', content: image.alt },
      { property: 'twitter:image', content: image.url },
      { name: 'twitter:image:alt', content: image.alt },
    );
  }

  return metaTags;
}

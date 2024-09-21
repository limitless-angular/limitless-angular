import type { SanityImageSource } from '@sanity/asset-utils';
import createImageUrlBuilder from '@sanity/image-url';

import { dataset, projectId } from '@/analog-sanity-blog-example/sanity';

const imageBuilder = createImageUrlBuilder({ projectId, dataset });

export const urlForImage = (source: SanityImageSource) => {
  return imageBuilder?.image(source).auto('format').fit('max');
};

export function resolveOpenGraphImage(
  image: unknown,
  width = 1200,
  height = 627,
) {
  if (!image) {
    return undefined;
  }

  const url = urlForImage(image as SanityImageSource)
    ?.width(1200)
    .height(627)
    .fit('crop')
    .url();
  if (!url) {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { url, alt: (image as any)['alt'] as string, width, height };
}

import createImageUrlBuilder from '@sanity/image-url';

import { dataset, projectId } from '@/analog-sanity-blog-example/sanity';

const imageBuilder = createImageUrlBuilder({ projectId, dataset });

export const urlForImage = (source: any) => {
  // Ensure that source image contains a valid reference
  if (!source?.asset?._ref) {
    return undefined;
  }

  return imageBuilder?.image(source).auto('format').fit('max');
};

export function resolveOpenGraphImage(image: any, width = 1200, height = 627) {
  if (!image) {
    return undefined;
  }

  const url = urlForImage(image)?.width(1200).height(627).fit('crop').url();
  if (!url) {
    return undefined;
  }

  return { url, alt: image?.alt as string, width, height };
}

import { Provider } from '@angular/core';
import { IMAGE_LOADER, ImageLoaderConfig } from '@angular/common';
import imageUrlBuilder from '@sanity/image-url';
import type {
  SanityImageSource,
  SanityImageObject,
  SanityReference,
  SanityAsset,
} from '@sanity/image-url/lib/types/types';

interface SanityConfig {
  projectId: string;
  dataset: string;
}

const DEFAULT_IMAGE_QUALITY = 75;

function getSanityRefId(image: SanityImageSource): string {
  if (typeof image === 'string') {
    return image;
  }

  const obj = image as SanityImageObject;
  const ref = image as SanityReference;
  const img = image as SanityAsset;

  if (obj.asset) {
    return obj.asset._ref || (obj.asset as SanityAsset)._id;
  }

  return ref._ref || img._id || '';
}

export function provideSanityLoader(config: SanityConfig): Provider {
  return {
    provide: IMAGE_LOADER,
    useValue: (loaderConfig: ImageLoaderConfig) => {
      const {
        src,
        loaderParams = {},
        width = loaderParams['width'],
        isPlaceholder,
      } = loaderConfig;
      const image = src as SanityImageSource;
      const id = getSanityRefId(image);
      if (!id) {
        throw new Error('Invalid Sanity image source');
      }

      const builder = imageUrlBuilder(config);
      let imageBuilder = builder
        .image(image)
        .auto('format')
        .fit((loaderParams['fit'] ?? loaderParams['height']) ? 'min' : 'max');

      if (width && loaderParams['height'] && loaderParams['width']) {
        imageBuilder = imageBuilder.height(
          Math.round((loaderParams['height'] / loaderParams['width']) * width),
        );
      }

      if (width) {
        imageBuilder = imageBuilder.width(width);
      }

      // Use loaderParams for additional configuration
      if (loaderParams['quality']) {
        imageBuilder = imageBuilder.quality(loaderParams['quality']);
      } else {
        imageBuilder = imageBuilder.quality(DEFAULT_IMAGE_QUALITY);
      }

      if (loaderParams['blur']) {
        imageBuilder = imageBuilder.blur(loaderParams['blur']);
      }

      if (isPlaceholder) {
        imageBuilder = imageBuilder.blur(50).quality(20);
      }

      return imageBuilder.url() || '';
    },
  };
}

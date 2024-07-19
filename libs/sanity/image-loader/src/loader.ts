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

interface SanityImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
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

function getImageDimensions(id: string): SanityImageDimensions {
  const dimensions = id.split('-')[2];
  const [width, height] = dimensions
    .split('x')
    .map((num: string) => parseInt(num, 10));
  const aspectRatio = width / height;

  return { width, height, aspectRatio };
}

function getCroppedDimensions(
  image: SanityImageSource,
  baseDimensions: SanityImageDimensions,
): SanityImageDimensions {
  const crop = (image as SanityImageObject).crop;

  if (!crop) {
    return baseDimensions;
  }

  const { width, height } = baseDimensions;
  const croppedWidth = width * (1 - (crop.left + crop.right));
  const croppedHeight = height * (1 - (crop.top + crop.bottom));

  return {
    width: croppedWidth,
    height: croppedHeight,
    aspectRatio: croppedWidth / croppedHeight,
  };
}

export function provideSanityLoader(config: SanityConfig): Provider {
  return {
    provide: IMAGE_LOADER,
    useValue: (loaderConfig: ImageLoaderConfig) => {
      const { src, width, isPlaceholder, loaderParams } = loaderConfig;
      const image = src as SanityImageSource;
      const id = getSanityRefId(image);

      if (!id) {
        throw new Error('Invalid Sanity image source');
      }

      const originalImageDimensions = getImageDimensions(id);
      const croppedImageDimensions = getCroppedDimensions(
        image,
        originalImageDimensions,
      );

      const builder = imageUrlBuilder(config);
      let imageBuilder = builder.image(image).auto('format');

      if (width) {
        imageBuilder = imageBuilder.width(width);
        const height = Math.round(width / croppedImageDimensions.aspectRatio);
        imageBuilder = imageBuilder.height(height);
      } else {
        imageBuilder = imageBuilder.width(croppedImageDimensions.width);
        imageBuilder = imageBuilder.height(croppedImageDimensions.height);
      }

      imageBuilder = imageBuilder.fit('clip');

      // Use loaderParams for additional configuration
      if (loaderParams) {
        if (loaderParams['quality']) {
          imageBuilder = imageBuilder.quality(loaderParams['quality']);
        } else {
          imageBuilder = imageBuilder.quality(DEFAULT_IMAGE_QUALITY);
        }

        if (loaderParams['blur']) {
          imageBuilder = imageBuilder.blur(loaderParams['blur']);
        }
      }

      if (isPlaceholder) {
        imageBuilder = imageBuilder.blur(50).quality(20);
      }

      return imageBuilder.url() || '';
    },
  };
}

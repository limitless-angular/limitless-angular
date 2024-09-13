import { inject, Provider } from '@angular/core';
import { IMAGE_LOADER, ImageLoaderConfig } from '@angular/common';

import imageUrlBuilder from '@sanity/image-url';

import { SANITY_CONFIG, SanityConfig } from '@limitless-angular/sanity/shared';

const DEFAULT_IMAGE_QUALITY = 75;

export function sanityImageLoader(config?: SanityConfig | null) {
  return (loaderConfig: ImageLoaderConfig) => {
    const {
      src,
      loaderParams = {},
      width = loaderParams['width'],
      isPlaceholder,
    } = loaderConfig;
    const builder = imageUrlBuilder(config ?? undefined);
    let imageBuilder = builder
      .image(src)
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
  };
}

export function provideSanityLoader(config?: SanityConfig): Provider {
  const configProviders = config
    ? [{ provide: SANITY_CONFIG, useValue: config }]
    : [];

  return [
    ...configProviders,
    {
      provide: IMAGE_LOADER,
      useFactory: () => {
        const config = inject(SANITY_CONFIG, { optional: true });
        return sanityImageLoader(config);
      },
    },
  ];
}

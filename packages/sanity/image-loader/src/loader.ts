import { inject, Provider } from '@angular/core';
import { IMAGE_LOADER, ImageLoaderConfig } from '@angular/common';

import imageUrlBuilder from '@sanity/image-url';

import { SANITY_CONFIG, SanityConfig } from '@limitless-angular/sanity/shared';

export function sanityImageLoader(config?: SanityConfig | null) {
  return (loaderConfig: ImageLoaderConfig) => {
    const { src, loaderParams = {}, width, isPlaceholder } = loaderConfig;
    let url: URL | undefined;
    const { quality, ...options } = loaderParams;
    try {
      url = new URL(src);
    } catch {
      const builder = imageUrlBuilder(config ?? undefined);
      url = new URL(builder.image(src).withOptions(options).url());
    }

    url.searchParams.set('auto', 'format');
    url.searchParams.set(
      'fit',
      url.searchParams.get('fit') || url.searchParams.has('h') ? 'min' : 'max',
    );
    if (width && url.searchParams.has('h') && url.searchParams.has('w')) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const originalHeight = parseInt(url.searchParams.get('h')!, 10);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const originalWidth = parseInt(url.searchParams.get('w')!, 10);
      url.searchParams.set(
        'h',
        Math.round((originalHeight / originalWidth) * width).toString(),
      );
    }

    if (width) {
      url.searchParams.set('w', width.toString());
    }

    if (quality) {
      url.searchParams.set('q', quality.toString());
    }

    if (isPlaceholder) {
      url.searchParams.set('blur', '50');
      url.searchParams.set('q', '20');
    }

    return url.href;
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

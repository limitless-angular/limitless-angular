import {
  Directive,
  inject,
  input,
  OnChanges,
  OnInit,
  SimpleChange,
  SimpleChanges,
} from '@angular/core';
import {
  IMAGE_LOADER,
  type ImageLoaderConfig,
  NgOptimizedImage,
} from '@angular/common';

import { createImageUrlBuilder } from '@sanity/image-url';
import type {
  ImageUrlBuilderOptionsWithAliases,
  SanityImageSource,
} from '@sanity/image-url';

import {
  SANITY_CONFIG,
  type SanityConfig,
} from '@limitless-angular/sanity/shared';
import { sanityImageLoader } from './loader';

type LoaderParams = Omit<ImageUrlBuilderOptionsWithAliases, 'quality'>;

const imageUrlInputs = [
  'sanityImage',
  'loaderParams',
  'quality',
  'width',
  'height',
];

const staticNgOptimizedImageInputs = ['loaderParams', 'width', 'height'];

function getNoopImageLoader() {
  return (
    IMAGE_LOADER.ɵprov as {
      factory: () => (config: ImageLoaderConfig) => string;
    }
  ).factory();
}

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: 'img[sanityImage]',
  // eslint-disable-next-line @angular-eslint/no-inputs-metadata-property
  inputs: ['ngSrc', 'loaderParams'],
  providers: [
    {
      provide: IMAGE_LOADER,
      useFactory: () => {
        const config = inject<SanityConfig>(SANITY_CONFIG);
        const imageLoader = inject(IMAGE_LOADER, { skipSelf: true });
        const noopImageLoader = getNoopImageLoader();
        return imageLoader !== noopImageLoader
          ? imageLoader
          : sanityImageLoader(config);
      },
    },
  ],
})
export class SanityImage extends NgOptimizedImage implements OnInit, OnChanges {
  sanityImage = input.required<SanityImageSource>();

  quality = input<number>();

  private imageUrl() {
    const url = new URL(
      createImageUrlBuilder(this.sanityConfig)
        .image(this.sanityImage())
        .withOptions((this.loaderParams ?? {}) as LoaderParams)
        .url(),
    );
    if (this.width) {
      url.searchParams.set('w', this.width.toString());
    }

    if (this.height) {
      url.searchParams.set('h', this.height.toString());
    }

    if (this.quality()) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      url.searchParams.set('q', this.quality()!.toString());
    }

    return url.toString();
  }

  private sanityConfig = inject<SanityConfig>(SANITY_CONFIG);

  override ngOnInit() {
    this.ngSrc = this.imageUrl();
    super.ngOnInit();
  }

  // ngSrc is not being updated by NgOptimizedImage, so we need to do it manually
  override ngOnChanges(changes: SimpleChanges) {
    const ngOptimizedImageChanges: SimpleChanges = { ...changes };

    if (imageUrlInputs.some((inputName) => changes[inputName])) {
      const previousNgSrc = this.ngSrc;
      const ngSrc = this.imageUrl();
      ngOptimizedImageChanges['ngSrc'] = new SimpleChange(
        previousNgSrc,
        ngSrc,
        !previousNgSrc,
      );
      this.ngSrc = ngSrc;
    }

    for (const inputName of staticNgOptimizedImageInputs) {
      if (
        ngOptimizedImageChanges[inputName] &&
        !ngOptimizedImageChanges[inputName].isFirstChange()
      ) {
        delete ngOptimizedImageChanges[inputName];
      }
    }

    super.ngOnChanges(ngOptimizedImageChanges);
  }
}

import {
  computed,
  Directive,
  inject,
  Input,
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

import type {
  ImageUrlBuilderOptions,
  SanityImageSource,
} from '@sanity/image-url/lib/types/types';
import imageUrlBuilder from '@sanity/image-url';

import { SANITY_CONFIG } from '@limitless-angular/sanity/shared';
import { sanityImageLoader } from './loader';

type LoaderParams = Omit<ImageUrlBuilderOptions, 'quality'>;

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
  standalone: true,
  providers: [
    {
      provide: IMAGE_LOADER,
      useFactory: () => {
        const config = inject(SANITY_CONFIG);
        const imageLoader = inject(IMAGE_LOADER, { skipSelf: true });
        const noopImageLoader = getNoopImageLoader();
        return imageLoader !== noopImageLoader
          ? imageLoader
          : sanityImageLoader(config);
      },
    },
  ],
})
// eslint-disable-next-line @angular-eslint/directive-class-suffix
export class SanityImage extends NgOptimizedImage implements OnInit, OnChanges {
  private _loaderParams: LoaderParams = {};

  sanityImage = input.required<SanityImageSource>();

  @Input()
  // @ts-expect-error we want to add some internal properties to loaderParams input
  override set loaderParams(loaderParams: LoaderParams) {
    this._loaderParams = loaderParams;
  }

  override get loaderParams(): LoaderParams {
    return this._loaderParams;
  }

  @Input() override ngSrc!: string;

  quality = input<number>();

  private imageUrl = computed(() => {
    const url = new URL(
      imageUrlBuilder(this.sanityConfig)
        .image(this.sanityImage())
        .withOptions(this.loaderParams)
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
  });

  private sanityConfig = inject(SANITY_CONFIG);

  override ngOnInit() {
    this.ngSrc = this.imageUrl();
    super.ngOnInit();
  }

  // ngSrc is not being updated by NgOptimizedImage, so we need to do it manually
  override ngOnChanges(changes: SimpleChanges) {
    if (changes['sanityImage']) {
      changes['ngSrc'] = new SimpleChange(
        this.ngSrc,
        this.imageUrl(),
        changes['sanityImage'].isFirstChange(),
      );
      this.ngSrc = this.imageUrl();
    }

    super.ngOnChanges(changes);
  }
}

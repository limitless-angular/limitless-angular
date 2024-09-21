import {
  computed,
  Directive,
  inject,
  Input,
  input,
  OnInit,
} from '@angular/core';
import {
  IMAGE_LOADER,
  type ImageLoaderConfig,
  NgOptimizedImage,
} from '@angular/common';

import type { SanityImageSource } from '@sanity/image-url/lib/types/types';
import imageUrlBuilder from '@sanity/image-url';

import { SANITY_CONFIG } from '@limitless-angular/sanity/shared';
import { sanityImageLoader } from './loader';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LoaderParams = Record<string, any>;

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
export class SanityImage extends NgOptimizedImage implements OnInit {
  private _loaderParams!: LoaderParams;

  sanityImage = input.required<SanityImageSource>();

  @Input()
  // @ts-expect-error we want to add some internal properties to loaderParams input
  override set loaderParams(loaderParams: LoaderParams) {
    this._loaderParams = this.prepareLoaderParams(loaderParams);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override get loaderParams(): Record<string, any> {
    return this._loaderParams;
  }

  @Input() override ngSrc!: string;

  quality = input<number>();

  private computedSrc = computed(() => this.constructSanityUrl());

  private sanityConfig = inject(SANITY_CONFIG);

  override ngOnInit() {
    this.ngSrc = this.computedSrc();
    if (!this._loaderParams) {
      this._loaderParams = this.prepareLoaderParams({});
    }

    super.ngOnInit();
  }

  private constructSanityUrl() {
    return imageUrlBuilder(this.sanityConfig).image(this.sanityImage()).url();
  }

  private prepareLoaderParams(loaderParams: LoaderParams): LoaderParams {
    const params: LoaderParams = {};
    if (this.width) {
      params['width'] = this.width;
    }

    if (this.height) {
      params['height'] = this.height;
    }

    if (this.quality()) {
      params['quality'] = this.quality();
    }

    return { ...params, ...loaderParams };
  }
}

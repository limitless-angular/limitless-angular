import {
  computed,
  Directive,
  inject,
  Input,
  input,
  OnInit,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

import type { SanityImageSource } from '@sanity/image-url/lib/types/types';
import imageUrlBuilder from '@sanity/image-url';

import { SANITY_CONFIG } from '@limitless-angular/sanity/shared';

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: 'img[sanityImage]',
  standalone: true,
})
// eslint-disable-next-line @angular-eslint/directive-class-suffix
export class SanityImage extends NgOptimizedImage implements OnInit {
  private _loaderParams!: Record<string, any>;

  sanityImage = input.required<SanityImageSource>();

  @Input()
  // @ts-expect-error we want to add some internal properties to loaderParams input
  override set loaderParams(loaderParams: Record<string, any>) {
    this._loaderParams = this.prepareLoaderParams(loaderParams);
  }

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

  private prepareLoaderParams(
    loaderParams: Record<string, any>,
  ): Record<string, any> {
    const params: Record<string, any> = {};
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

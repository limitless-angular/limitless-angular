import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

import { provideSanityLoader } from '@limitless-angular/sanity/image-loader';
import { PortableTextTypeComponent } from '@limitless-angular/sanity/portabletext';

interface Asset {
  _ref: string;
  _type: string;
}

export interface ImageBlock {
  _type: 'image';
  _key: string;
  asset: Asset;
}

@Component({
  selector: 'app-image',
  standalone: true,
  imports: [NgOptimizedImage],
  template: `
    <img
      class="mx-auto"
      [ngSrc]="value().asset._ref"
      [width]="300"
      [height]="300"
      alt="Sanity Image"
    />
  `,
  styles: `
    :host {
      @apply block h-[300px];
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Project data taken from https://www.sanity.io/demos/studio
  providers: [provideSanityLoader({ projectId: 'k4hg38xw', dataset: 'demo' })],
})
export class ImageComponent extends PortableTextTypeComponent<ImageBlock> {}

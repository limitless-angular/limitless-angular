import { ChangeDetectionStrategy, Component, computed } from '@angular/core';

import { getImageDimensions } from '@sanity/asset-utils';

import {
  provideSanityLoader,
  SanityImage,
} from '@limitless-angular/sanity/image-loader';
import { PortableTextTypeComponent } from '@limitless-angular/sanity/portabletext';

@Component({
  selector: 'app-image',
  standalone: true,
  imports: [SanityImage],
  template: `
    <img
      class="mx-auto"
      alt="Sanity Image"
      [sanityImage]="value()"
      [width]="dimensions().width"
      [height]="dimensions().height"
    />
  `,
  styles: `
    :host {
      @apply block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Project data taken from https://www.sanity.io/demos/studio
  providers: [provideSanityLoader({ projectId: 'k4hg38xw', dataset: 'demo' })],
})
export class ImageComponent extends PortableTextTypeComponent {
  dimensions = computed(() => getImageDimensions(this.value()));
}

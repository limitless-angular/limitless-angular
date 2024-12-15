import {
  Component,
  ChangeDetectionStrategy,
  computed,
  input,
  booleanAttribute,
} from '@angular/core';

import { SanityImage } from '@limitless-angular/sanity/image-loader';

@Component({
  selector: 'blog-cover-image',
  imports: [SanityImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="shadow-md transition-shadow duration-200 group-hover:shadow-lg sm:mx-0"
    >
      @if (hasValidImage()) {
        <img
          class="h-auto w-full"
          width="2000"
          height="1000"
          sizes="100vw"
          [alt]="image()!.alt ?? ''"
          [sanityImage]="this.image()!"
          [loaderParams]="{ width: 2000, height: 1000 }"
          [priority]="priority()"
        />
      } @else {
        <div class="bg-slate-50" style="padding-top: 50%;"></div>
      }
    </div>
  `,
})
export class CoverImageComponent {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  image = input.required<any>();
  priority = input(false, { transform: booleanAttribute });

  hasValidImage = computed(() => !!this.image()?.asset?._ref);
}

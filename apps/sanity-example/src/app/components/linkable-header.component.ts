import { ChangeDetectionStrategy, Component, computed } from '@angular/core';

import {
  PortableTextBlockComponent,
  toPlainText,
} from '@limitless-angular/sanity/portabletext';

/**
 * This is obviously extremely simplistic, you'd want to use something "proper"
 */
function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'h2',
  standalone: true,
  template: `
    <ng-container #children />
    @if (slug(); as slugValue) {
      <a class="slug-anchor" [attr.href]="'#' + slugValue">#</a>
    }
  `,
  styles: `
    :host:hover .slug-anchor {
      opacity: 1;
    }

    .slug-anchor {
      @apply opacity-0 no-underline text-gray-500 inline-block px-2 py-1 ml-1 hover:bg-[#eee];
    }
  `,
  host: {
    '[id]': 'slug()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinkableHeaderComponent extends PortableTextBlockComponent {
  slug = computed(() => slugify(toPlainText(this.value())));
}

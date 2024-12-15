import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { SettingsQueryResult } from '@/analog-sanity-blog-example/sanity';
import { PortableTextComponent } from './portable-text.component';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'footer[blog-footer]',
  imports: [PortableTextComponent],
  template: `<div class="container mx-auto px-5">
    @if ((footer()?.length ?? 0) > 0) {
      <blog-portable-text [value]="$any(footer())" />
    } @else {
      <div class="flex flex-col items-center py-28 lg:flex-row">
        <h3
          class="mb-10 text-center text-4xl font-bold leading-tight tracking-tighter lg:mb-0 lg:w-1/2 lg:pr-4 lg:text-left lg:text-5xl"
        >
          Built with Analog.
        </h3>
        <div
          class="flex flex-col items-center justify-center lg:w-1/2 lg:flex-row lg:pl-4"
        >
          <a
            href="https://analogjs.org/docs"
            class="mx-3 mb-6 border border-black bg-black py-3 px-12 font-bold text-white transition-colors duration-200 hover:bg-white hover:text-black lg:mb-0 lg:px-8"
          >
            Read Documentation
          </a>
          <a
            href="https://github.com/osnoser1/analog-sanity-blog"
            class="mx-3 font-bold hover:underline"
          >
            View on GitHub
          </a>
        </div>
      </div>
    }
  </div>`,
  host: { class: 'bg-accent-1 border-accent-2 border-t' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  footer = input.required<
    Exclude<SettingsQueryResult, null>['footer'] | undefined
  >();
}

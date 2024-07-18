import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import {
  PortableTextComponent,
  PortableTextComponents,
} from '@limitless-angular/sanity/portabletext';

import { blocks } from './fixture';
import { LinkComponent } from './components/link.component';
import { SpeechSynthesisComponent } from './components/speech-synthesis.component';
import { CurrencyAmountComponent } from './components/currency-amount.component';
import { LinkableHeaderComponent } from './components/linkable-header.component';

/**
 * Note that these are statically defined (outside the scope of a function),
 * which ensures that unnecessary rerenders does not happen because of a new
 * components object being generated on every render. The alternative is to
 * `useMemo()`, but if you can get away with this approach it is _better_.
 **/
const ptComponents: PortableTextComponents = {
  // Components for totally custom types outside the scope of Portable Text
  types: {
    currencyAmount: CurrencyAmountComponent,
  },

  // Overrides for specific block styles - in this case just the `h2` style
  block: {
    h2: LinkableHeaderComponent,
  },

  // Custom components for marks - note that `link` overrides the default component,
  // while the others define components for totally custom types.
  marks: {
    link: LinkComponent,
    speech: SpeechSynthesisComponent,
  },
};

@Component({
  standalone: true,
  imports: [RouterOutlet, PortableTextComponent],
  selector: 'app-root',
  template: `
    <main>
      <article
        class="prose lg:prose-xl mx-auto"
        portable-text
        [value]="blocks"
        [components]="ptComponents"
      ></article>
    </main>
    <router-outlet />
  `,
  styles: ``,
})
export class AppComponent {
  protected readonly blocks = blocks;
  protected readonly ptComponents = ptComponents;
}

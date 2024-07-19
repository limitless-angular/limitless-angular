import { ChangeDetectionStrategy, Component } from '@angular/core';
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
import { SchnauzerListComponent } from './components/schnauzer-list.component';
import { AnnotatedMapComponent } from './components/annotated-map.component';
import { TermDefinitionComponent } from './components/term-definition.component';
import { CharacterReferenceComponent } from './components/character-reference.component';
import { CodeComponent } from './components/code.component';
import { ImageComponent } from './components/image.component';

const ptComponents: PortableTextComponents = {
  // Components for totally custom types outside the scope of Portable Text
  types: {
    code: CodeComponent,
    currencyAmount: CurrencyAmountComponent,
    annotatedMap: AnnotatedMapComponent,
    image: ImageComponent,
  },

  // Overrides for specific block styles - in this case just the `h2` style
  block: {
    h2: LinkableHeaderComponent,
  },

  // Implements a custom component to handle the `schnauzer` list item type
  list: {
    schnauzer: SchnauzerListComponent,
  },

  // Custom components for marks - note that `link` overrides the default component,
  // while the others define components for totally custom types.
  marks: {
    link: LinkComponent,
    characterReference: CharacterReferenceComponent,
    speech: SpeechSynthesisComponent,
    definition: TermDefinitionComponent,
  },
};

@Component({
  standalone: true,
  imports: [RouterOutlet, PortableTextComponent],
  selector: 'app-root',
  template: `
    <main>
      <article
        class="prose lg:prose-xl prose-code:bg-[#eee] prose-code:after:content-[''] prose-code:before:content-[''] mx-auto pt-8"
        portable-text
        [value]="blocks"
        [components]="ptComponents"
      ></article>
    </main>
    <router-outlet />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  protected readonly blocks = blocks;
  protected readonly ptComponents = ptComponents;
}

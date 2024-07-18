import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PortableTextMarkComponent } from '@limitless-angular/sanity/portabletext';

interface DefinitionMark {
  _type: 'definition';
  details: string;
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'term-definition',
  standalone: true,
  template: `<span class="peer"><ng-container #children /></span
    ><span
      class="peer-hover:inline-block w-[350px] bg-white px-1 border border-solid rounded-md absolute left-1/2
    -translate-x-1/2 translate-y-1/3 hidden m-4 mx-auto"
      >{{ value()?.details }}</span
    >`,
  host: {
    '[class]': '"relative underline"',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermDefinitionComponent extends PortableTextMarkComponent<DefinitionMark> {}

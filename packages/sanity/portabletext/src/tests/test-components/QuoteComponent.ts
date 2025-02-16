import { Component, effect } from '@angular/core';
import { PortableTextTypeComponent } from '../../directives/portable-text-directives';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'p',
  // prettier-ignore
  template: `@for (child of value().children; track child.text) {Customers say: {{ child.text }}}`,
  host: { '[style.background]': 'value().background' },
})
export class QuoteComponent extends PortableTextTypeComponent {
  _ = effect(() => {
    expect(this.value()).toEqual({
      _key: '9a15ea2ed8a2',
      _type: 'quote',
      background: 'blue',
      children: [
        {
          _key: '9a15ea2ed8a2',
          _type: 'span',
          text: 'This is an inspirational quote',
        },
      ],
    });
    expect(this.isInline()).toEqual(false);
  });
}

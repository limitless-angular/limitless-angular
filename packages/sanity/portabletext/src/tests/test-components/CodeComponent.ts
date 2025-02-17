import { expect } from 'vitest';
import { Component, effect } from '@angular/core';
import { PortableTextTypeComponent } from '../../directives/portable-text-directives';
import * as fixtures from '../fixtures';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'pre',
  template: '<code>{{ value().code }}</code>',
  host: { '[attr.data-language]': 'value().language' },
})
export class CodeComponent extends PortableTextTypeComponent {
  _ = effect(() => {
    expect(this.value()).toEqual({
      _key: '9a15ea2ed8a2',
      _type: 'code',
      code: fixtures.customBlockType.input[0]?.['code'],
      language: 'javascript',
    });
    expect(this.isInline()).toEqual(false);
  });
}

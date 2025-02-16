import { Component } from '@angular/core';
import { PortableTextTypeComponent } from '../../directives/portable-text-directives';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'button',
  template: '{{ value().text }}',
  host: { '[type]': '"button"' },
})
export class ButtonComponent extends PortableTextTypeComponent {}

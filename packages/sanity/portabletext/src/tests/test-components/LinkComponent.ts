import { Component } from '@angular/core';
import { PortableTextMarkComponent } from '../../directives/portable-text-directives';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'a',
  template: '<ng-container #children />',
  host: { '[class]': '"mahlink"', '[href]': 'value().href' },
})
export class LinkComponent extends PortableTextMarkComponent<{
  _type: 'link';
  href: string;
}> {}

import { Component } from '@angular/core';
import { PortableTextListItemComponent } from '../../directives/portable-text-directives';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'li',
  template: '<ng-container #children />',
  host: { '[class]': '"item-squared"' },
})
export class SquareListItemComponent extends PortableTextListItemComponent {}

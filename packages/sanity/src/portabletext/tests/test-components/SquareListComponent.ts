import { Component } from '@angular/core';
import { PortableTextListComponent } from '../../directives/portable-text-directives';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'ul',
  template: '<ng-container #children />',
  host: { '[class]': '"list-squared"' },
})
export class SquareListComponent extends PortableTextListComponent {}

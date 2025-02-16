import { Component } from '@angular/core';
import { PortableTextTypeComponent } from '../../directives/portable-text-directives';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'span',
  template: '',
  host: {
    '[class]': '"rating type-" + value().type + " rating-" + value().rating',
  },
})
export class RatingComponent extends PortableTextTypeComponent {}

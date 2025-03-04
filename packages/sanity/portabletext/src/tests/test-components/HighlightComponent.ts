import { Component } from '@angular/core';
import { PortableTextMarkComponent } from '../../directives/portable-text-directives';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'span',
  template: '<ng-container #children />',
  host: {
    '[style.border]': 'value().thickness + "px solid"',
    '[class.highlight]': 'true',
  },
})
export class HighlightComponent extends PortableTextMarkComponent<{
  _type: 'highlight';
  thickness: number;
}> {}

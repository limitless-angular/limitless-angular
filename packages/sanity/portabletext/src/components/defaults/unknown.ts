/* eslint-disable @angular-eslint/component-selector */
/* eslint-disable @angular-eslint/component-class-suffix */
import { Component, computed } from '@angular/core';
import {
  PortableTextBlockComponent,
  PortableTextListComponent,
  PortableTextListItemComponent,
  PortableTextMarkComponent,
  PortableTextTypeComponent,
} from '../../directives/portable-text-directives';
import { unknownTypeWarning } from '../../warnings';

const template = '<ng-container #children />';

@Component({
  selector: 'span',
  template: `{{ warning() }}`,
  host: { '[style.display]': '"none"' },
})
export class DefaultUnknownType extends PortableTextTypeComponent {
  protected readonly warning = computed(() =>
    unknownTypeWarning(this.value()._type),
  );
}

@Component({
  selector: 'span,span[data-unknown="true"]',
  template,
  host: { '[class]': '"unknown__pt__mark__" + markType()' },
})
export class DefaultUnknownMark extends PortableTextMarkComponent {}

@Component({ selector: 'p,p[data-unknown="true"]', template })
export class DefaultUnknownBlockStyle extends PortableTextBlockComponent {}

@Component({ selector: 'ul,ul[data-unknown="true"]', template })
export class DefaultUnknownList extends PortableTextListComponent {}

@Component({ selector: 'li,li[data-unknown="true"]', template })
export class DefaultUnknownListItem extends PortableTextListItemComponent {}

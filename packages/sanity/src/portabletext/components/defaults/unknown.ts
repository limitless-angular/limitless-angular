/* eslint-disable @angular-eslint/component-selector */
/* eslint-disable @angular-eslint/component-class-suffix */
import { Component } from '@angular/core';
import {
  PortableTextBlockComponent,
  PortableTextListComponent,
  PortableTextListItemComponent,
  PortableTextMarkComponent,
} from '../../directives/portable-text-directives';

const template = '<ng-container #children />';

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

/* eslint-disable @angular-eslint/component-class-suffix */
/* eslint-disable @angular-eslint/component-selector */
import { Component, type Type } from '@angular/core';
import {
  PortableTextListComponent,
  PortableTextListItemComponent,
} from '../../directives/portable-text-directives';

const template = '<ng-container #children />';

@Component({ selector: 'ol', template })
export class NumberList extends PortableTextListComponent {}

@Component({ selector: 'ul', template })
export class BulletList extends PortableTextListComponent {}

@Component({ selector: 'li', template })
export class ListItem extends PortableTextListItemComponent {}

export const defaultLists: Record<
  'number' | 'bullet',
  Type<PortableTextListComponent>
> = {
  number: NumberList,
  bullet: BulletList,
};

export const DefaultListItem: Type<PortableTextListItemComponent> = ListItem;

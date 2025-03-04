/* eslint-disable @angular-eslint/component-class-suffix */
/* eslint-disable @angular-eslint/component-selector */
import { Component, type Type } from '@angular/core';
import { PortableTextMarkComponent } from '../../directives/portable-text-directives';
import type { TypedObject } from '@portabletext/types';

interface DefaultLink extends TypedObject {
  _type: 'link';
  href: string;
}

const template = '<ng-container #children />';

@Component({ selector: 'em', template })
export class Em extends PortableTextMarkComponent {}

@Component({ selector: 'strong', template })
export class Strong extends PortableTextMarkComponent {}

@Component({ selector: 'code', template })
export class Code extends PortableTextMarkComponent {}

@Component({ selector: 'del', template })
export class Del extends PortableTextMarkComponent {}

@Component({ selector: 'a', template, host: { '[href]': 'value()?.href' } })
export class Link extends PortableTextMarkComponent<DefaultLink> {}

@Component({
  selector: 'span',
  template,
  host: { '[style.text-decoration]': '"underline"' },
})
export class Underline extends PortableTextMarkComponent {}

export const defaultMarks: Record<
  string,
  Type<PortableTextMarkComponent> | undefined
> = {
  em: Em,
  strong: Strong,
  code: Code,
  underline: Underline,
  'strike-through': Del,
  link: Link,
};

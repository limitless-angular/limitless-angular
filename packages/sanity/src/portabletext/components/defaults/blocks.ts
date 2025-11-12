/* eslint-disable @angular-eslint/component-class-suffix */
/* eslint-disable @angular-eslint/component-selector */
import { Component, type Type } from '@angular/core';
import type { PortableTextBlockStyle } from '@portabletext/types';
import { PortableTextBlockComponent } from '../../directives/portable-text-directives';

const template = '<ng-container #children />';

@Component({ selector: 'p', template })
export class Paragraph extends PortableTextBlockComponent {}

@Component({ selector: 'blockquote', template })
export class Blockquote extends PortableTextBlockComponent {}

@Component({ selector: 'h1', template })
export class Heading1 extends PortableTextBlockComponent {}

@Component({ selector: 'h2', template })
export class Heading2 extends PortableTextBlockComponent {}

@Component({ selector: 'h3', template })
export class Heading3 extends PortableTextBlockComponent {}

@Component({ selector: 'h4', template })
export class Heading4 extends PortableTextBlockComponent {}

@Component({ selector: 'h5', template })
export class Heading5 extends PortableTextBlockComponent {}

@Component({ selector: 'h6', template })
export class Heading6 extends PortableTextBlockComponent {}

export const defaultBlockStyles: Record<
  PortableTextBlockStyle,
  Type<PortableTextBlockComponent> | undefined
> = {
  normal: Paragraph,
  blockquote: Blockquote,
  h1: Heading1,
  h2: Heading2,
  h3: Heading3,
  h4: Heading4,
  h5: Heading5,
  h6: Heading6,
};

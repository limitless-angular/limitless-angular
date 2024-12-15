/**
 * This component uses Portable Text to render a post body.
 *
 * You can learn more about Portable Text on:
 * https://www.sanity.io/docs/block-content
 * https://github.com/limitless-angular/limitless-angular
 * https://portabletext.org/
 *
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  PortableTextBlockComponent,
  PortableTextComponent as SanityPortableTextComponent,
  PortableTextComponents,
  PortableTextMarkComponent,
} from '@limitless-angular/sanity/portabletext';
import { TypedObject } from '@portabletext/types';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'h5',
  standalone: true,
  template: `<ng-container #children />`,
  host: { '[class]': '"mb-2 text-sm font-semibold"' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Heading5Component extends PortableTextBlockComponent {}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'h6',
  standalone: true,
  template: `<ng-container #children />`,
  host: { '[class]': '"mb-2 text-sm font-semibold"' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Heading6Component extends PortableTextBlockComponent {}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'a',
  standalone: true,
  template: `<ng-container #children />`,
  host: {
    '[href]': 'value()?.href',
    '[rel]': '"noreferrer noopener"',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinkComponent extends PortableTextMarkComponent<{
  _type: 'link';
  href: string;
}> {}

@Component({
  selector: 'blog-portable-text',
  imports: [SanityPortableTextComponent],
  template: `@if (value(); as value) {
    <div
      portable-text
      [class]="containerClasses()"
      [value]="value"
      [components]="components"
    ></div>
  }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortableTextComponent {
  class = input<string>('');
  value = input<TypedObject>();

  protected containerClasses = computed(() =>
    ['prose', this.class()].filter(Boolean).join(' '),
  );

  protected readonly components: PortableTextComponents = {
    block: {
      h5: Heading5Component,
      h6: Heading6Component,
    },
    marks: {
      link: LinkComponent,
    },
  };
}

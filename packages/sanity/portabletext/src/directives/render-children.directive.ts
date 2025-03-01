import {
  Directive,
  effect,
  inject,
  input,
  ViewContainerRef,
} from '@angular/core';

import { TypedObject } from '@portabletext/types';

import { PortableTextComponent } from '../components/portable-text.component';

// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[renderChildren]' })
// eslint-disable-next-line @angular-eslint/directive-class-suffix
export class RenderChildren {
  children = input.required<(TypedObject & { isInline?: boolean })[]>({
    alias: 'renderChildren',
  });
  #renderNode = inject(PortableTextComponent).renderNode;
  #vcr = inject(ViewContainerRef);

  constructor() {
    effect(() => {
      this.#vcr.clear();
      this.children().forEach((child, index) => {
        this.#vcr.createEmbeddedView(this.#renderNode(), {
          $implicit: child,
          isInline: child.isInline ?? true,
          index: index,
        });
      });
    });
  }
}

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
@Directive({ selector: '[renderNode]' })
// eslint-disable-next-line @angular-eslint/directive-class-suffix
export class RenderNode {
  node = input.required<TypedObject>({ alias: 'renderNode' });
  index = input<number>();
  isInline = input.required<boolean>();
  #renderNode = inject(PortableTextComponent).renderNode;
  #vcr = inject(ViewContainerRef);

  constructor() {
    effect(() => {
      this.#vcr.clear();
      this.#vcr.createEmbeddedView(this.#renderNode(), {
        $implicit: this.node(),
        isInline: this.isInline(),
        index: this.index(),
      });
    });
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  inject,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';

import {
  spanToPlainText,
  ToolkitNestedPortableTextSpan,
} from '@portabletext/toolkit';

import { TemplateContext } from '../types';
import { MISSING_COMPONENT_HANDLER } from '../tokens';
import { unknownMarkWarning } from '../warnings';
import { PortableTextComponent } from './portable-text.component';

@Component({
  selector: 'lib-span',
  imports: [NgComponentOutlet],
  template: `
    <ng-template #spanTmpl let-node
      ><ng-container
        *ngComponentOutlet="
          getMarkComponent(node);
          inputs: {
            children: node.children,
            text: spanToPlainText(node),
            value: node.markDef,
            markKey: node.markKey,
            markType: node.markType,
          }
        "
    /></ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class SpanComponent {
  template =
    viewChild.required<
      TemplateRef<TemplateContext<ToolkitNestedPortableTextSpan>>
    >('spanTmpl');
  components = inject(PortableTextComponent).components;
  #missingHandler = inject(MISSING_COMPONENT_HANDLER);

  getMarkComponent = (node: ToolkitNestedPortableTextSpan) => {
    const Span =
      this.components().marks?.[node.markType] ?? this.components().unknownMark;
    if (Span === this.components().unknownMark) {
      this.handleMissingComponent(node.markType);
    }

    return Span;
  };

  handleMissingComponent(markType: string) {
    this.#missingHandler(unknownMarkWarning(markType), {
      type: markType,
      nodeType: 'mark',
    });
  }

  protected readonly spanToPlainText = spanToPlainText;
}

import {
  ChangeDetectionStrategy,
  Component,
  inject,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';

import {
  spanToPlainText,
  ToolkitNestedPortableTextSpan,
} from '@portabletext/toolkit';

import { TemplateContext } from '../types';
import { trackBy } from '../utils';
import { MISSING_COMPONENT_HANDLER } from '../tokens';
import { unknownMarkWarning } from '../warnings';
import { PortableTextComponent } from './portable-text.component';
import { RenderNode } from '../directives/render-node.directive';

@Component({
  selector: 'lib-span',
  imports: [NgTemplateOutlet, NgComponentOutlet, RenderNode],
  template: `
    <ng-template #spanTmpl let-node>
      @if (components().marks?.[node.markType]; as MarkComponent) {
        <ng-container
          *ngComponentOutlet="
            MarkComponent;
            inputs: {
              template: children,
              context: { children: node.children },
              text: spanToPlainText(node),
              value: node.markDef,
              markKey: node.markKey,
              markType: node.markType,
            }
          "
        />
      } @else {
        {{ handleMissingComponent(node.markType)
        }}<span [class]="'unknown__pt__mark__' + node.markType"
          ><ng-container
            *ngTemplateOutlet="children; context: { children: node.children }"
        /></span>
      }
    </ng-template>

    <ng-template #children let-children="children">
      @for (
        child of children;
        track trackBy(child._key, $index);
        let index = $index
      ) {
        <ng-container [renderNode]="child" [isInline]="true" [index]="index" />
      }
    </ng-template>
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

  handleMissingComponent(markType: string) {
    this.#missingHandler(unknownMarkWarning(markType), {
      type: markType,
      nodeType: 'mark',
    });
  }

  protected readonly spanToPlainText = spanToPlainText;
  protected readonly trackBy = trackBy;
}

import {
  ChangeDetectionStrategy,
  Component,
  inject,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';

import { MISSING_COMPONENT_HANDLER } from '../tokens';
import { TemplateContext, PortableTextListBlock } from '../types';
import { trackBy } from '../utils';
import { unknownListStyleWarning } from '../warnings';
import { PortableTextComponent } from './portable-text.component';
@Component({
  selector: 'lib-list',
  imports: [NgTemplateOutlet, NgComponentOutlet],
  template: `
    <ng-template #listTmpl let-node>
      <ng-template #children>
        <ng-container *ngTemplateOutlet="listChildren; context: { node }" />
      </ng-template>
      @if (components().list?.[node.listItem]) {
        <ng-container
          *ngComponentOutlet="
            components().list?.[node.listItem]!;
            inputs: {
              childrenData: {
                template: listChildren,
                context: { node },
              },
              value: node,
              isInline: false,
            }
          "
        />
      } @else {
        @switch (node.listItem) {
          @case ('bullet') {
            <ul>
              <ng-container *ngTemplateOutlet="children" />
            </ul>
          }
          @case ('number') {
            <ol>
              <ng-container *ngTemplateOutlet="children" />
            </ol>
          }
          @default {
            <ul>
              <ng-container *ngTemplateOutlet="children" />{{
                handleMissingComponent(node)
              }}
            </ul>
          }
        }
      }
    </ng-template>

    <ng-template #listChildren let-node="node">
      @for (
        child of node.children;
        track trackBy(child._key, index, 'li');
        let index = $index
      ) {
        <ng-container
          *ngTemplateOutlet="
            renderNode();
            context: {
              $implicit: getChildNode(child, index),
              index,
              isInline: false,
            }
          "
        />
      }
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ListComponent {
  template =
    viewChild.required<TemplateRef<TemplateContext<PortableTextListBlock>>>(
      'listTmpl',
    );
  components = inject(PortableTextComponent).components;
  renderNode = inject(PortableTextComponent).renderNode;

  missingHandler = inject(MISSING_COMPONENT_HANDLER);

  handleMissingComponent(node: PortableTextListBlock) {
    const style = node.listItem || 'bullet';
    this.missingHandler(unknownListStyleWarning(style), {
      nodeType: 'listStyle',
      type: style,
    });
  }

  protected getChildNode(
    child: PortableTextListBlock['children'][0],
    index: number,
  ) {
    return child._key ? child : { ...child, _key: `li-${index}` };
  }

  protected readonly trackBy = trackBy;
}

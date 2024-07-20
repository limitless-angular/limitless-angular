import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';

import { PortableTextListBlock, TemplateContext } from '../types';
import { trackBy } from '../utils';

@Component({
  selector: 'lib-list',
  standalone: true,
  imports: [NgTemplateOutlet, NgComponentOutlet],
  template: `
    <ng-template
      #listTmpl
      let-node
      let-components="components"
      let-renderNode="renderNode"
    >
      <ng-template #children>
        <ng-container
          *ngTemplateOutlet="
            listChildren;
            context: { node, components, renderNode }
          "
        />
      </ng-template>
      @if (components.list?.[node.listItem]) {
        <ng-container
          *ngComponentOutlet="
            components.list?.[node.listItem];
            inputs: {
              childrenData: {
                template: listChildren,
                context: { node, components, renderNode },
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
            <!-- TODO: remove class when warning msg be implemented -->
            <ul [class]="'unknown__pt__list__' + node.listItem">
              <ng-container *ngTemplateOutlet="children" />
            </ul>
          }
        }
      }
    </ng-template>

    <ng-template
      #listChildren
      let-node="node"
      let-components="components"
      let-renderNode="renderNode"
    >
      @for (
        child of node.children;
        track trackBy(child._key, index, 'li');
        let index = $index
      ) {
        <ng-container
          *ngTemplateOutlet="
            renderNode;
            context: {
              $implicit: getChildNode(child, index),
              index,
              isInline: false,
              components,
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

  protected getChildNode(
    child: PortableTextListBlock['children'][0],
    index: number,
  ) {
    return child._key ? child : { ...child, _key: `li-${index}` };
  }

  protected readonly trackBy = trackBy;
}

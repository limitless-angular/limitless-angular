import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';

import {
  PortableTextListItemBlock,
  PortableTextMarkDefinition,
  PortableTextSpan,
} from '@portabletext/types';

import { TemplateContext } from '../types';
import { serializeBlock } from '../utils';

@Component({
  selector: 'lib-list-item',
  imports: [NgTemplateOutlet, NgComponentOutlet],
  template: `<ng-template
    #listItemTmpl
    let-node
    let-index="index"
    let-components="components"
    let-renderNode="renderNode"
  >
    <ng-template #listItemChildren>
      @for (
        child of serializeBlock({ node, isInline: false }).children;
        track child._key
      ) {
        <ng-container
          *ngTemplateOutlet="
            renderNode;
            context: { $implicit: child, isInline: true, components }
          "
        />
      }
    </ng-template>

    @if (components.listItem?.[node.listItem]) {
      <ng-container
        *ngComponentOutlet="
          components.listItem?.[node.listItem];
          inputs: {
            childrenData: {
              template: listItemChildren,
              context: { node, index, components, renderNode },
            },
            value: node,
            index,
            isInline: false,
          }
        "
      />
    } @else {
      <li>
        <ng-container *ngTemplateOutlet="listItemChildren" />
      </li>
    }
  </ng-template>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ListItemComponent {
  template =
    viewChild.required<
      TemplateRef<
        TemplateContext<
          PortableTextListItemBlock<
            PortableTextMarkDefinition,
            PortableTextSpan
          >
        > & { index: number }
      >
    >('listItemTmpl');

  protected readonly serializeBlock = serializeBlock;
}

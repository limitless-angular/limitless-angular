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
  PortableTextListItemBlock,
  PortableTextMarkDefinition,
  PortableTextSpan,
} from '@portabletext/types';

import { TemplateContext } from '../types';
import { serializeBlock } from '../utils';
import { PortableTextComponent } from './portable-text.component';
import { RenderNodeDirective } from '../directives/render-node.directive';

@Component({
  selector: 'lib-list-item',
  imports: [NgTemplateOutlet, NgComponentOutlet, RenderNodeDirective],
  template: `<ng-template #listItemTmpl let-node let-index="index">
    <ng-template #listItemChildren>
      @if (node.style && node.style !== 'normal') {
        <ng-container
          [renderNode]="getNodeWithoutListItem(node)"
          [isInline]="false"
          [index]="index"
        />
      } @else {
        @for (
          child of serializeBlock({ node, isInline: false }).children;
          track child._key
        ) {
          <ng-container [renderNode]="child" [isInline]="true" />
        }
      }
    </ng-template>

    @if ($any(components()).listItem?.[node.listItem]) {
      <ng-container
        *ngComponentOutlet="
          $any(components()).listItem?.[node.listItem]!;
          inputs: {
            childrenData: {
              template: listItemChildren,
              context: { node, index },
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
  components = inject(PortableTextComponent).components;

  getNodeWithoutListItem = (node: PortableTextListItemBlock) => {
    // Wrap any other style in whatever the block serializer says to use
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { listItem, ...blockNode } = node;
    return blockNode;
  };

  protected readonly serializeBlock = serializeBlock;
}

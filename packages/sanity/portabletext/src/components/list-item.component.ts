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

import { Serializable, TemplateContext } from '../types';
import { serializeBlock, trackBy } from '../utils';
import { PortableTextComponent } from './portable-text.component';
import { RenderNode } from '../directives/render-node.directive';
import { memoize } from 'lodash-es';

@Component({
  selector: 'lib-list-item',
  imports: [NgTemplateOutlet, NgComponentOutlet, RenderNode],
  template: `<ng-template #listItemTmpl let-node let-index="index">
      @if ($any(components()).listItem?.[node.listItem]; as ListItemComponent) {
        <ng-container
          *ngComponentOutlet="
            ListItemComponent;
            inputs: {
              template: children,
              context: { children: getChildren({ node, index }) },
              value: node,
              index,
              isInline: false,
            }
          "
        />
      } @else {
        <!-- TODO: this should be a unknown list item component -->
        <li>
          <ng-container
            *ngTemplateOutlet="
              children;
              context: { children: getChildren({ node, index }) }
            "
          />
        </li>
      }
    </ng-template>

    <ng-template #children let-children="children">
      @for (
        child of children;
        track trackBy(child._key, index);
        let index = $index
      ) {
        <ng-container
          [renderNode]="child"
          [isInline]="child.isInline"
          [index]="index"
        />
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

  getChildren: (
    opts: Omit<Serializable<PortableTextListItemBlock>, 'isInline'>,
  ) => unknown[] = memoize((options) => {
    const { node, index } = options;
    const tree = serializeBlock({ node, index, isInline: false });
    let children = tree.children;
    if (node.style && node.style !== 'normal') {
      // Wrap any other style in whatever the block serializer says to use
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { listItem, ...blockNode } = node;
      children = [{ ...blockNode, isInline: false }];
    }

    return children;
  });

  protected readonly trackBy = trackBy;
}

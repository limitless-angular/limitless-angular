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
  PortableTextListItemBlock,
  PortableTextMarkDefinition,
  PortableTextSpan,
} from '@portabletext/types';

import { Serializable, TemplateContext } from '../types';
import { serializeBlock } from '../utils';
import { PortableTextComponent } from './portable-text.component';
import { memoize } from 'lodash-es';
import { unknownListItemStyleWarning } from '../warnings';
import { MISSING_COMPONENT_HANDLER } from '../tokens';

@Component({
  selector: 'lib-list-item',
  imports: [NgComponentOutlet],
  template: `<ng-template #listItemTmpl let-node let-index="index"
    ><ng-container
      *ngComponentOutlet="
        getListItemComponent(node);
        inputs: {
          children: getChildren({ node, index }),
          value: node,
          index,
          isInline: false,
        }
      "
  /></ng-template>`,
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
  #missingHandler = inject(MISSING_COMPONENT_HANDLER);

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

  getListItemComponent = (node: PortableTextListItemBlock) => {
    const renderer = this.components().listItem;
    const handler =
      typeof renderer === 'function' ? renderer : renderer[node.listItem];
    const Li = handler ?? this.components().unknownListItem;
    if (Li === this.components().unknownListItem) {
      const style = node.listItem || 'bullet';
      this.#missingHandler(unknownListItemStyleWarning(style), {
        nodeType: 'listItemStyle',
        type: style,
      });
    }

    return Li;
  };
}

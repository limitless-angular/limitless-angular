import { Injectable } from '@angular/core';
import {
  PortableTextListItemBlock,
  PortableTextMarkDefinition,
  PortableTextSpan,
} from '@portabletext/types';
import { memoize } from 'lodash-es';

import {
  MissingComponentHandler,
  PortableTextComponents,
  Serializable,
} from '../types';
import { serializeBlock } from '../utils';
import { unknownListItemStyleWarning } from '../warnings';

/**
 * Service for handling list item nodes in Portable Text
 */
@Injectable({ providedIn: 'root' })
export class ListItemHandlerService {
  /**
   * Gets the appropriate component for a list item based on its style
   *
   * @param node The list item node
   * @param components The available components
   * @returns The component to use for rendering the list item
   */
  getComponent(
    node: PortableTextListItemBlock<
      PortableTextMarkDefinition,
      PortableTextSpan
    >,
    missingHandler: MissingComponentHandler,
    components: Required<PortableTextComponents>,
  ) {
    const renderer = components.listItem;
    const handler =
      typeof renderer === 'function' ? renderer : renderer[node.listItem];
    const Li = handler ?? components.unknownListItem;

    if (Li === components.unknownListItem) {
      const style = node.listItem || 'bullet';
      missingHandler(unknownListItemStyleWarning(style), {
        nodeType: 'listItemStyle',
        type: style,
      });
    }

    return Li;
  }

  /**
   * Gets the children of a list item node
   *
   * @param options The serialization options
   * @returns The children of the list item
   */
  getChildren: (
    options: Omit<Serializable<PortableTextListItemBlock>, 'isInline'>,
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

  /**
   * Gets the input properties for a list item component
   *
   * @param node The list item node
   * @param index The index of the node
   * @param isInline Whether the node is inline
   * @returns The input properties for the component
   */
  getInputProps(
    node: PortableTextListItemBlock<
      PortableTextMarkDefinition,
      PortableTextSpan
    >,
    index: number,
    isInline: boolean,
  ): Record<string, unknown> {
    return {
      children: this.getChildren({ node, index }),
      value: node,
      index,
      isInline,
    };
  }
}

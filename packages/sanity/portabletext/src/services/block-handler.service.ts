import { Injectable } from '@angular/core';
import { PortableTextBlock } from '@portabletext/types';
import { memoize } from 'lodash-es';

import {
  MissingComponentHandler,
  PortableTextComponents,
  Serializable,
} from '../types';
import { serializeBlock } from '../utils';
import { unknownBlockStyleWarning } from '../warnings';
import { isPortableTextBlock } from '@portabletext/toolkit';

/**
 * Service for handling block nodes in Portable Text
 */
@Injectable({ providedIn: 'root' })
export class BlockHandlerService {
  /**
   * Checks if the service can handle the given node
   *
   * @param node The node to check
   * @returns True if the service can handle the node
   */
  canHandle = isPortableTextBlock;

  /**
   * Gets the appropriate component for a block based on its style
   *
   * @param node The block node
   * @param components The available components
   * @returns The component to use for rendering the block
   */
  getComponent(
    node: PortableTextBlock,
    missingHandler: MissingComponentHandler,
    components: Required<PortableTextComponents>,
  ) {
    const style = node.style ?? 'normal';
    const Block = components.block?.[style] ?? components.unknownBlockStyle;

    if (Block === components.unknownBlockStyle) {
      missingHandler(unknownBlockStyleWarning(style), {
        nodeType: 'blockStyle',
        type: style,
      });
    }

    return Block;
  }

  /**
   * Gets the input properties for a block component
   *
   * @param node The block node
   * @param index The index of the node
   * @param isInline Whether the node is inline
   * @returns The input properties for the component
   */
  getInputProps(
    node: PortableTextBlock,
    index: number | undefined,
    isInline: boolean,
  ): Record<string, unknown> {
    return {
      value: node,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      children: this.#getChildren({ node, index: index!, isInline }),
      isInline,
    };
  }

  /**
   * Gets the children of a block node
   *
   * @param options The serialization options
   * @returns The children of the block
   */
  #getChildren: (options: Serializable<PortableTextBlock>) => unknown[] =
    memoize((options) => serializeBlock(options).children);
}

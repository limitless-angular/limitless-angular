import { Injectable } from '@angular/core';
import {
  MissingComponentHandler,
  PortableTextAngularComponents,
  PortableTextListBlock,
} from '../types';
import { unknownListStyleWarning } from '../warnings';
import { isPortableTextToolkitList } from '@portabletext/toolkit';

/**
 * Service for handling list nodes in Portable Text
 */
@Injectable({ providedIn: 'root' })
export class ListHandlerService {
  /**
   * Checks if the service can handle the given node
   *
   * @param node The node to check
   * @returns True if the service can handle the node
   */
  canHandle = isPortableTextToolkitList;

  /**
   * Gets the appropriate component for a list based on its style
   *
   * @param node The list node
   * @param components The available components
   * @returns The component to use for rendering the list
   */
  getComponent(
    node: PortableTextListBlock,
    missingHandler: MissingComponentHandler,
    components: PortableTextAngularComponents,
  ) {
    const renderer = components.list;
    const handler =
      typeof renderer === 'function' ? renderer : renderer[node.listItem];
    const List = handler ?? components.unknownList;

    if (List === components.unknownList) {
      const style = node.listItem || 'bullet';
      missingHandler(unknownListStyleWarning(style), {
        nodeType: 'listStyle',
        type: style,
      });
    }

    return List;
  }

  /**
   * Gets the input properties for a list component
   *
   * @param node The list node
   * @param index The index of the node
   * @param isInline Whether the node is inline
   * @returns The input properties for the component
   */
  getInputProps(
    node: PortableTextListBlock,
    index: number | undefined,
    _isInline: boolean,
  ): Record<string, unknown> {
    return {
      children: node.children.map((child, childIndex) => ({
        ...child,
        _key: child._key ?? `li-${index}-${childIndex}`,
        index: childIndex,
        isInline: false,
      })),
      value: node,
      index,
      isInline: false,
    };
  }
}

import { Injectable, TemplateRef, Type, inject } from '@angular/core';
import { TypedObject } from '@portabletext/types';
import {
  isPortableTextToolkitTextNode,
  ToolkitTextNode,
} from '@portabletext/toolkit';

import { BlockHandlerService } from './block-handler.service';
import { ListHandlerService } from './list-handler.service';
import { ListItemHandlerService } from './list-item-handler.service';
import { SpanHandlerService } from './span-handler.service';
import { MissingComponentHandler, PortableTextComponents } from '../types';
import { unknownTypeWarning } from '../warnings';

const CustomComponentHandler = {
  canHandle: hasCustomComponentForNode,
  getComponent: (
    node: TypedObject,
    _: unknown,
    components: Required<PortableTextComponents>,
  ) => getCustomComponentForNode(node, components),
  getInputProps: (node: TypedObject, _: unknown, isInline: boolean) => ({
    value: node,
    isInline,
  }),
};

/**
 * Service for resolving node types to their appropriate handlers
 */
@Injectable({ providedIn: 'root' })
export class NodeResolverService {
  #handlers = [
    inject(ListHandlerService),
    inject(ListItemHandlerService),
    inject(SpanHandlerService),
    CustomComponentHandler,
    inject(BlockHandlerService),
  ] as const;

  /**
   * Resolves a node to its appropriate template and context for rendering
   *
   * @param node The node to resolve
   * @param components The available components
   * @param missingHandler The handler for missing components
   * @param templates An object containing the available templates
   * @param index The index of the node
   * @param isInline Whether the node is inline
   * @returns An object containing the template and context for rendering the node
   */
  resolveNode(
    node: TypedObject,
    components: Required<PortableTextComponents>,
    missingHandler: MissingComponentHandler,
    templates: {
      nodeRenderer: TemplateRef<unknown>;
      text: TemplateRef<unknown>;
      unknown: TemplateRef<{ node: TypedObject; isInline: boolean }>;
    },
    index?: number,
    isInline = false,
  ): {
    template: TemplateRef<unknown>;
    context: Record<string, unknown>;
  } {
    for (const handler of this.#handlers) {
      if (!handler.canHandle(node, components)) {
        continue;
      }

      const componentType = handler.getComponent(
        node as never,
        missingHandler,
        components,
      );
      const inputProps = handler.getInputProps(node as never, index, isInline);
      return {
        template: templates.nodeRenderer,
        context: { componentType, inputProps },
      };
    }

    // Special case for text nodes
    if (isPortableTextToolkitTextNode(node)) {
      return {
        template: templates.text,
        context: { $implicit: node as ToolkitTextNode, components },
      };
    }

    missingHandler(unknownTypeWarning(node._type), {
      nodeType: 'block',
      type: node._type,
    });

    return { template: templates.unknown, context: { node, isInline } };
  }
}

/**
 * Gets the custom component for the given node
 *
 * @param node The node to get the component for
 * @param components The available components
 * @returns The component type for the node
 */
function getCustomComponentForNode(
  node: TypedObject,
  components: Required<PortableTextComponents>,
): Type<unknown> {
  return components.types[node._type] as Type<unknown>;
}

/**
 * Checks if a custom component exists for the given node
 *
 * @param node The node to check
 * @param components The available components
 * @returns True if a custom component exists for the node
 */
function hasCustomComponentForNode(
  node: TypedObject,
  components: Required<PortableTextComponents>,
): boolean {
  return node._type in components.types;
}

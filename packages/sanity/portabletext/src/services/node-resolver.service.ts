import { Injectable, TemplateRef, Type, inject } from '@angular/core';
import { TypedObject } from '@portabletext/types';
import {
  isPortableTextBlock,
  isPortableTextListItemBlock,
  isPortableTextToolkitList,
  isPortableTextToolkitSpan,
  isPortableTextToolkitTextNode,
  ToolkitTextNode,
} from '@portabletext/toolkit';

import { BlockHandlerService } from './block-handler.service';
import { ListHandlerService } from './list-handler.service';
import { ListItemHandlerService } from './list-item-handler.service';
import { SpanHandlerService } from './span-handler.service';
import { MissingComponentHandler, PortableTextComponents } from '../types';
import { unknownTypeWarning } from '../warnings';

/**
 * Service for resolving node types to their appropriate handlers
 */
@Injectable({ providedIn: 'root' })
export class NodeResolverService {
  #blockHandler = inject(BlockHandlerService);
  #listHandler = inject(ListHandlerService);
  #listItemHandler = inject(ListItemHandlerService);
  #spanHandler = inject(SpanHandlerService);

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
    if (isPortableTextToolkitList(node)) {
      const componentType = this.#listHandler.getComponent(
        node,
        missingHandler,
        components,
      );
      const inputProps = this.#listHandler.getInputProps(node, index, isInline);
      return {
        template: templates.nodeRenderer,
        context: { componentType, inputProps },
      };
    }

    if (isPortableTextListItemBlock(node)) {
      const componentType = this.#listItemHandler.getComponent(
        node,
        missingHandler,
        components,
      );
      const inputProps = this.#listItemHandler.getInputProps(
        node,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        index!,
        isInline,
      );
      return {
        template: templates.nodeRenderer,
        context: { componentType, inputProps },
      };
    }

    if (isPortableTextToolkitSpan(node)) {
      const componentType = this.#spanHandler.getComponent(
        node,
        missingHandler,
        components,
      );
      const inputProps = this.#spanHandler.getInputProps(node);
      return {
        template: templates.nodeRenderer,
        context: { componentType, inputProps },
      };
    }

    if (this.hasCustomComponentForNode(node, components)) {
      const componentType = this.getCustomComponentForNode(node, components);
      const inputProps = { value: node, isInline };
      return {
        template: templates.nodeRenderer,
        context: { componentType, inputProps },
      };
    }

    if (isPortableTextBlock(node)) {
      const componentType = this.#blockHandler.getComponent(
        node,
        missingHandler,
        components,
      );
      const inputProps = this.#blockHandler.getInputProps(
        node,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        index!,
        isInline,
      );
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

  /**
   * Checks if a custom component exists for the given node
   *
   * @param node The node to check
   * @param components The available components
   * @returns True if a custom component exists for the node
   */
  hasCustomComponentForNode(
    node: TypedObject,
    components: Required<PortableTextComponents>,
  ): boolean {
    return node._type in components.types;
  }

  /**
   * Gets the custom component for the given node
   *
   * @param node The node to get the component for
   * @param components The available components
   * @returns The component type for the node
   */
  getCustomComponentForNode(
    node: TypedObject,
    components: Required<PortableTextComponents>,
  ): Type<unknown> {
    return components.types[node._type] as Type<unknown>;
  }
}

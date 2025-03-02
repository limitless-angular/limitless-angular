import { Injectable } from '@angular/core';
import {
  ToolkitNestedPortableTextSpan,
  spanToPlainText,
} from '@portabletext/toolkit';

import { unknownMarkWarning } from '../warnings';
import { MissingComponentHandler, PortableTextComponents } from '../types';

/**
 * Service for handling span nodes in Portable Text
 */
@Injectable({ providedIn: 'root' })
export class SpanHandlerService {
  /**
   * Gets the appropriate component for a span based on its mark type
   *
   * @param node The span node
   * @param components The available components
   * @returns The component to use for rendering the span
   */
  getComponent(
    node: ToolkitNestedPortableTextSpan,
    missingHandler: MissingComponentHandler,
    components: Required<PortableTextComponents>,
  ) {
    const Span = components.marks?.[node.markType] ?? components.unknownMark;

    if (Span === components.unknownMark) {
      missingHandler(unknownMarkWarning(node.markType), {
        type: node.markType,
        nodeType: 'mark',
      });
    }

    return Span;
  }

  /**
   * Gets the input properties for a span component
   *
   * @param node The span node
   * @returns The input properties for the component
   */
  getInputProps(node: ToolkitNestedPortableTextSpan): Record<string, unknown> {
    return {
      children: node.children,
      text: spanToPlainText(node),
      value: node.markDef,
      markKey: node.markKey,
      markType: node.markType,
    };
  }
}

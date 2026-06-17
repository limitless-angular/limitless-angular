import { InjectionToken, type Signal, type TemplateRef } from '@angular/core';
import type { TypedObject } from '@portabletext/types';

import type { RenderNodeContext } from './types';

export type PortableTextChild = TypedObject & {
  index?: number;
  isInline?: boolean;
};

export interface PortableTextChildrenContext {
  children: PortableTextChild[];
  isInline?: boolean;
}

/** Internal renderer contract shared by recursive Portable Text directives. */
export interface PortableTextRendererContext {
  childrenTmpl: Signal<TemplateRef<PortableTextChildrenContext>>;
  renderNode: Signal<TemplateRef<RenderNodeContext>>;
}

/** @internal */
export const PORTABLE_TEXT_RENDERER_CONTEXT =
  new InjectionToken<PortableTextRendererContext>(
    'PORTABLE_TEXT_RENDERER_CONTEXT',
  );

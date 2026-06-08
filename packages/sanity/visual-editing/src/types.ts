import type {
  ClientPerspective,
  ContentSourceMapDocuments,
} from '@sanity/client';
import type {
  ApplicationRef,
  EnvironmentInjector,
  Injector,
  Type,
} from '@angular/core';
import type {
  DisableVisualEditing,
  DragEndEvent,
  DragInsertPosition,
  DragSkeleton,
  ElementFocusedState,
  ElementNode,
  ElementState,
  HistoryAdapter,
  HistoryAdapterNavigate,
  Msg,
  OverlayController,
  OverlayEventHandler,
  OverlayMsg,
  OverlayMsgActivate,
  OverlayMsgBlur,
  OverlayMsgDeactivate,
  OverlayMsgDragEnd,
  OverlayMsgDragEndMinimapTransition,
  OverlayMsgDragStart,
  OverlayMsgDragStartMinimapTransition,
  OverlayMsgDragToggleMinimap,
  OverlayMsgDragToggleMinimapPrompt,
  OverlayMsgDragUpdateCursorPosition,
  OverlayMsgDragUpdateGroupRect,
  OverlayMsgDragUpdateInsertPosition,
  OverlayMsgDragUpdateSkeleton,
  OverlayMsgElement,
  OverlayMsgElementActivate,
  OverlayMsgElementClick,
  OverlayMsgElementContextMenu,
  OverlayMsgElementDeactivate,
  OverlayMsgElementMouseEnter,
  OverlayMsgElementMouseLeave,
  OverlayMsgElementRegister,
  OverlayMsgElementUnregister,
  OverlayMsgElementUpdate,
  OverlayMsgElementUpdateRect,
  OverlayMsgSetCursor,
  OverlayOptions,
  OverlayRect,
  VisualEditingOptions as SanityVisualEditingOptions,
} from '@sanity/visual-editing';
import type {
  OverlayComponentResolverContext as SanityOverlayComponentResolverContext,
  OverlayElementField,
  OverlayElementParent,
} from '@sanity/visual-editing/unstable_overlay-components';
import type { VisualEditingNode } from '@sanity/visual-editing/optimistic';
import type {
  DocumentSchema,
  HistoryRefresh,
  HistoryUpdate,
  PreviewSnapshot,
  ResolvedSchemaTypeMap,
  SanityNode,
  SanityStegaNode,
  SchemaArrayItem,
  SchemaArrayNode,
  SchemaBooleanNode,
  SchemaInlineNode,
  SchemaNode,
  SchemaNullNode,
  SchemaNumberNode,
  SchemaObjectField,
  SchemaObjectNode,
  SchemaStringNode,
  SchemaType,
  SchemaUnionNode,
  SchemaUnionNodeOptions,
  SchemaUnionOption,
  SchemaUnknownNode,
  TypeSchema,
  UnresolvedPath,
  VisualEditingControllerMsg,
  VisualEditingNodeMsg,
} from '@sanity/presentation-comlink';

export type {
  DisableVisualEditing,
  DragEndEvent,
  DragInsertPosition,
  DragSkeleton,
  ElementFocusedState,
  ElementNode,
  ElementState,
  HistoryAdapter,
  HistoryAdapterNavigate,
  Msg,
  OverlayController,
  OverlayEventHandler,
  OverlayMsg,
  OverlayMsgActivate,
  OverlayMsgBlur,
  OverlayMsgDeactivate,
  OverlayMsgDragEnd,
  OverlayMsgDragEndMinimapTransition,
  OverlayMsgDragStart,
  OverlayMsgDragStartMinimapTransition,
  OverlayMsgDragToggleMinimap,
  OverlayMsgDragToggleMinimapPrompt,
  OverlayMsgDragUpdateCursorPosition,
  OverlayMsgDragUpdateGroupRect,
  OverlayMsgDragUpdateInsertPosition,
  OverlayMsgDragUpdateSkeleton,
  OverlayMsgElement,
  OverlayMsgElementActivate,
  OverlayMsgElementClick,
  OverlayMsgElementContextMenu,
  OverlayMsgElementDeactivate,
  OverlayMsgElementMouseEnter,
  OverlayMsgElementMouseLeave,
  OverlayMsgElementRegister,
  OverlayMsgElementUnregister,
  OverlayMsgElementUpdate,
  OverlayMsgElementUpdateRect,
  OverlayMsgSetCursor,
  OverlayOptions,
  OverlayRect,
};
export type {
  OverlayElementField,
  OverlayElementParent,
} from '@sanity/visual-editing/unstable_overlay-components';
export type { VisualEditingNode } from '@sanity/visual-editing/optimistic';
export type {
  DocumentSchema,
  HistoryRefresh,
  HistoryUpdate,
  PreviewSnapshot,
  ResolvedSchemaTypeMap,
  SanityNode,
  SanityStegaNode,
  SchemaArrayItem,
  SchemaArrayNode,
  SchemaBooleanNode,
  SchemaInlineNode,
  SchemaNode,
  SchemaNullNode,
  SchemaNumberNode,
  SchemaObjectField,
  SchemaObjectNode,
  SchemaStringNode,
  SchemaType,
  SchemaUnionNode,
  SchemaUnionNodeOptions,
  SchemaUnionOption,
  SchemaUnknownNode,
  TypeSchema,
  UnresolvedPath,
  VisualEditingControllerMsg,
  VisualEditingNodeMsg,
};

export interface Ray2D {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface DragInsertPositionRects {
  top?: OverlayRect | null;
  left?: OverlayRect | null;
  bottom?: OverlayRect | null;
  right?: OverlayRect | null;
}

export interface SanityNodeElements {
  element: ElementNode;
  measureElement: ElementNode;
}

export interface ResolvedElement {
  elements: SanityNodeElements;
  sanity: SanityNode | SanityStegaNode;
}

export interface OverlayElement {
  id: string;
  elements: SanityNodeElements;
  handlers: EventHandlers;
  sanity: SanityNode | SanityStegaNode;
}

export interface EventHandlers {
  click: (event: MouseEvent) => void;
  contextmenu: (event: MouseEvent) => void;
  mousedown: (event: MouseEvent) => void;
  mouseenter: (event: MouseEvent) => void;
  mouseleave: (event: MouseEvent) => void;
  mousemove: (event: MouseEvent) => void;
}

export type OverlayComponentResolverContext<
  P extends OverlayElementParent = OverlayElementParent,
> = SanityOverlayComponentResolverContext<P>;

export interface AngularOverlayComponentProps<
  P extends OverlayElementParent = OverlayElementParent,
> extends OverlayComponentResolverContext<P> {
  PointerEvents: Type<unknown>;
}

export type AngularOverlayComponent<
  T extends Record<string, unknown> = Record<string, unknown>,
  P extends OverlayElementParent = OverlayElementParent,
> = Type<AngularOverlayComponentProps<P | undefined> & T>;

export type AngularOverlayComponentDefinition<
  T extends AngularOverlayComponent = AngularOverlayComponent,
> = {
  component: T;
  inputs?: Record<string, unknown>;
  props?: Record<string, unknown>;
};

export type AngularOverlayComponentResolver<
  T extends AngularOverlayComponent = AngularOverlayComponent,
> = (
  context: OverlayComponentResolverContext,
) =>
  | T
  | AngularOverlayComponentDefinition<T>
  | Array<T | AngularOverlayComponentDefinition<T>>
  | globalThis.Node
  | undefined
  | void;

export interface VisualEditingOptions
  extends Omit<SanityVisualEditingOptions, 'components'> {
  /**
   * @alpha Angular-native custom overlay resolver. Reserved for the custom
   * overlay component parity layer.
   */
  components?: AngularOverlayComponentResolver;
  /**
   * Angular application ref used to attach dynamically rendered overlay
   * components. Required when `components` returns Angular components.
   */
  applicationRef?: ApplicationRef;
  /**
   * Angular environment injector used to instantiate custom overlay
   * components. Required when `components` returns Angular components.
   */
  environmentInjector?: EnvironmentInjector;
  /**
   * Optional element injector used when instantiating custom overlay
   * components.
   */
  injector?: Injector;
}

export interface VisualEditingRuntimeOptions extends VisualEditingOptions {
  portal?: boolean;
}

export interface ContextMenuProps {
  node: SanityNode;
  onDismiss: () => void;
  position: {
    x: number;
    y: number;
  };
}

export interface OverlayState {
  contextMenu: {
    node: SanityNode;
    position: {
      x: number;
      y: number;
    };
  } | null;
  focusPath: string;
  elements: ElementState[];
  wasMaybeCollapsed: boolean;
  perspective: ClientPerspective;
  isDragging: boolean;
  dragInsertPosition: DragInsertPosition;
  dragSkeleton: DragSkeleton | null;
  dragShowMinimap: boolean;
  dragShowMinimapPrompt: boolean;
  dragMinimapTransition: boolean;
  dragGroupRect: OverlayRect | null;
}

export type ReportedDocuments = ContentSourceMapDocuments;

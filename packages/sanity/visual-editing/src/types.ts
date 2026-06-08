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
import type { Node as ComlinkNode } from '@sanity/comlink';
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

export interface OverlayRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

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

export type DragInsertPosition = {
  top?: { rect: OverlayRect; sanity: SanityNode } | null;
  left?: { rect: OverlayRect; sanity: SanityNode } | null;
  bottom?: { rect: OverlayRect; sanity: SanityNode } | null;
  right?: { rect: OverlayRect; sanity: SanityNode } | null;
} | null;

export interface DragEndEvent {
  insertPosition: DragInsertPosition;
  target: SanityNode;
  dragGroup: string | null;
  flow: string;
  preventInsertDefault: boolean;
}

export type DragSkeleton = {
  w: number;
  h: number;
  offsetX: number;
  offsetY: number;
  childRects: {
    x: number;
    y: number;
    w: number;
    h: number;
    tagName: string;
  }[];
  maxWidth: number;
};

export interface Msg<T extends string> {
  type: T;
}

export interface OverlayMsgElement<T extends string>
  extends Msg<`element/${T}`> {
  id: string;
}

export type OverlayMsgElementActivate = OverlayMsgElement<'activate'>;
export type OverlayMsgBlur = Msg<'overlay/blur'>;
export type OverlayMsgActivate = Msg<'overlay/activate'>;
export type OverlayMsgDeactivate = Msg<'overlay/deactivate'>;

export type OverlayMsgSetCursor = Msg<'overlay/setCursor'> & {
  element: ElementNode;
  cursor: string | undefined;
};

export type OverlayMsgElementContextMenu =
  | OverlayMsgElement<'contextmenu'>
  | (OverlayMsgElement<'contextmenu'> & {
      position: {
        x: number;
        y: number;
      };
      sanity: SanityNode;
    });

export type OverlayMsgElementDeactivate = OverlayMsgElement<'deactivate'>;

export type OverlayMsgElementClick = OverlayMsgElement<'click'> & {
  sanity: SanityNode | SanityStegaNode;
};

export type OverlayMsgElementMouseEnter = OverlayMsgElement<'mouseenter'> & {
  rect: OverlayRect;
};

export type OverlayMsgElementMouseLeave = OverlayMsgElement<'mouseleave'>;

export type OverlayMsgElementRegister = OverlayMsgElement<'register'> & {
  element: ElementNode;
  sanity: SanityNode | SanityStegaNode;
  rect: OverlayRect;
  dragDisabled: boolean;
};

export type OverlayMsgElementUpdate = OverlayMsgElement<'update'> & {
  sanity: SanityNode | SanityStegaNode;
  rect: OverlayRect;
};

export type OverlayMsgElementUnregister = OverlayMsgElement<'unregister'>;

export type OverlayMsgElementUpdateRect = OverlayMsgElement<'updateRect'> & {
  rect: OverlayRect;
};

export type OverlayMsgDragUpdateInsertPosition =
  Msg<'overlay/dragUpdateInsertPosition'> & {
    insertPosition: DragInsertPosition | null;
  };

export type OverlayMsgDragUpdateCursorPosition =
  Msg<'overlay/dragUpdateCursorPosition'> & {
    x: number;
    y: number;
  };

export type OverlayMsgDragStart = Msg<'overlay/dragStart'> & {
  flow: 'horizontal' | 'vertical';
};

export type OverlayMsgDragToggleMinimapPrompt =
  Msg<'overlay/dragToggleMinimapPrompt'> & {
    display: boolean;
  };

export type OverlayMsgDragToggleMinimap = Msg<'overlay/dragToggleMinimap'> & {
  display: boolean;
};

export type OverlayMsgDragUpdateSkeleton = Msg<'overlay/dragUpdateSkeleton'> & {
  skeleton: DragSkeleton;
};

export type OverlayMsgDragEnd = Msg<'overlay/dragEnd'> & DragEndEvent;

export type OverlayMsgDragUpdateGroupRect =
  Msg<'overlay/dragUpdateGroupRect'> & {
    groupRect: OverlayRect | null;
  };

export type OverlayMsgDragStartMinimapTransition =
  Msg<'overlay/dragStartMinimapTransition'>;

export type OverlayMsgDragEndMinimapTransition =
  Msg<'overlay/dragEndMinimapTransition'>;

export type OverlayMsg =
  | OverlayMsgActivate
  | OverlayMsgBlur
  | OverlayMsgDeactivate
  | OverlayMsgDragEnd
  | OverlayMsgDragEndMinimapTransition
  | OverlayMsgDragStart
  | OverlayMsgDragStartMinimapTransition
  | OverlayMsgDragToggleMinimap
  | OverlayMsgDragToggleMinimapPrompt
  | OverlayMsgDragUpdateCursorPosition
  | OverlayMsgDragUpdateGroupRect
  | OverlayMsgDragUpdateInsertPosition
  | OverlayMsgDragUpdateSkeleton
  | OverlayMsgElementActivate
  | OverlayMsgElementClick
  | OverlayMsgElementContextMenu
  | OverlayMsgElementDeactivate
  | OverlayMsgElementMouseEnter
  | OverlayMsgElementMouseLeave
  | OverlayMsgElementRegister
  | OverlayMsgElementUnregister
  | OverlayMsgElementUpdate
  | OverlayMsgElementUpdateRect
  | OverlayMsgSetCursor;

export type OverlayEventHandler = (message: OverlayMsg) => void;

export interface OverlayOptions {
  handler: OverlayEventHandler;
  overlayElement: HTMLElement;
  inFrame: boolean;
  inPopUp: boolean;
  optimisticActorReady: boolean;
}

export interface OverlayController {
  activate: () => void;
  deactivate: () => void;
  destroy: () => void;
}

export type ElementFocusedState = 'clicked' | 'duplicate' | boolean;

export interface ElementState {
  id: string;
  activated: boolean;
  element: ElementNode;
  focused: ElementFocusedState;
  hovered: boolean;
  rect: OverlayRect;
  sanity: SanityNode | SanityStegaNode;
  dragDisabled: boolean;
}

export type HistoryAdapterNavigate = (update: HistoryUpdate) => void;

export interface HistoryAdapter {
  subscribe: (navigate: HistoryAdapterNavigate) => () => void;
  update: (update: HistoryUpdate) => void;
}

export type ElementNode = HTMLElement | SVGElement;

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

export type VisualEditingNode = ComlinkNode<
  VisualEditingNodeMsg,
  VisualEditingControllerMsg
>;

export type DisableVisualEditing = () => void;

export interface OverlayComponentResolverContext<
  P extends OverlayElementParent = OverlayElementParent,
> {
  document: DocumentSchema;
  element: ElementNode;
  field: OverlayElementField;
  focused: boolean;
  node: SanityNode;
  parent: P;
  type: string;
}

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

export interface VisualEditingOptions {
  /**
   * @alpha Angular-native custom overlay resolver. Reserved for the custom
   * overlay component parity layer.
   */
  components?: AngularOverlayComponentResolver;
  /**
   * The history adapter is used for Sanity Presentation to navigate URLs in
   * the preview frame.
   */
  history?: HistoryAdapter;
  /**
   * The refresh API allows smarter refresh logic than the default full-page
   * reload behavior.
   */
  refresh?: (payload: HistoryRefresh) => false | Promise<void>;
  /**
   * The CSS z-index on the root node that renders overlays.
   */
  zIndex?: string | number;
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

export type OverlayElementField =
  | SchemaArrayItem
  | SchemaObjectField
  | SchemaUnionOption
  | undefined;

export type OverlayElementParent =
  | DocumentSchema
  | SchemaNode
  | SchemaArrayItem
  | SchemaUnionOption
  | SchemaUnionNode
  | undefined;

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

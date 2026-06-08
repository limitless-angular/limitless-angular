export { VisualEditingComponent } from './visual-editing.component';
export { VisualEditingPointerEventsComponent } from './pointer-events.component';
export { enableVisualEditing } from './enable-visual-editing';
export { createOverlayController } from './controller';
export {
  defineOverlayComponent,
  defineOverlayComponents,
} from './overlay-components';
export { getArrayItemKeyAndParentPath } from './mutation-utils';
export {
  createDataAttribute,
  type CreateDataAttribute,
  type CreateDataAttributeProps,
  type WithRequired,
} from '@sanity/visual-editing-csm';
export type {
  DisableVisualEditing,
  DragEndEvent,
  DragInsertPosition,
  DragSkeleton,
  AngularOverlayComponent,
  AngularOverlayComponentDefinition,
  AngularOverlayComponentProps,
  AngularOverlayComponentResolver,
  ElementFocusedState,
  ElementNode,
  ElementState,
  HistoryAdapter,
  HistoryAdapterNavigate,
  HistoryRefresh,
  HistoryUpdate,
  Msg,
  OverlayController,
  OverlayComponentResolverContext,
  OverlayElementField,
  OverlayElementParent,
  OverlayEventHandler,
  OverlayMsg,
  OverlayOptions,
  OverlayRect,
  SanityNode,
  SanityStegaNode,
  VisualEditingNode,
  VisualEditingOptions,
} from './types';

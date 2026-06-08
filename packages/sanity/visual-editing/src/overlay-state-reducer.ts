import type { ClientPerspective } from '@sanity/client';
import type {
  SanityNode,
  VisualEditingControllerMsg,
} from '@sanity/presentation-comlink';

import { elementsReducer } from './elements-reducer';
import type { OverlayMsg, OverlayRect, OverlayState } from './types';

export function createInitialOverlayState(): OverlayState {
  return {
    contextMenu: null,
    dragGroupRect: null,
    dragInsertPosition: null,
    dragMinimapTransition: false,
    dragShowMinimap: false,
    dragShowMinimapPrompt: false,
    dragSkeleton: null,
    elements: [],
    focusPath: '',
    isDragging: false,
    perspective: 'published',
    wasMaybeCollapsed: false,
  };
}

export function overlayStateReducer(
  state: OverlayState,
  message: OverlayMsg | VisualEditingControllerMsg,
): OverlayState {
  let contextMenu: {
    node: SanityNode;
    position: { x: number; y: number };
  } | null = state.contextMenu;
  let dragGroupRect: OverlayRect | null = state.dragGroupRect;
  let dragInsertPosition = state.dragInsertPosition;
  let dragMinimapTransition = state.dragMinimapTransition;
  let dragShowMinimap = state.dragShowMinimap;
  let dragShowMinimapPrompt = state.dragShowMinimapPrompt;
  let dragSkeleton = state.dragSkeleton;
  let focusPath = state.focusPath;
  let isDragging = state.isDragging;
  let perspective: ClientPerspective = state.perspective;
  let wasMaybeCollapsed = false;

  if (message.type === 'presentation/focus') {
    const prevFocusPath = state.focusPath;
    focusPath = message.data.path;
    wasMaybeCollapsed = prevFocusPath.slice(focusPath.length).startsWith('[');
  }

  if (message.type === 'presentation/perspective') {
    perspective = message.data.perspective;
  }

  if (message.type === 'element/contextmenu') {
    contextMenu =
      'sanity' in message
        ? { node: message.sanity, position: message.position }
        : null;
  }

  if (
    message.type === 'element/click' ||
    message.type === 'element/mouseleave' ||
    message.type === 'overlay/blur' ||
    message.type === 'presentation/blur' ||
    message.type === 'presentation/focus'
  ) {
    contextMenu = null;
  }

  if (message.type === 'overlay/dragUpdateInsertPosition') {
    dragInsertPosition = message.insertPosition;
  }

  if (message.type === 'overlay/dragStart') {
    isDragging = true;
  }

  if (message.type === 'overlay/dragUpdateSkeleton') {
    dragSkeleton = message.skeleton;
  }

  if (message.type === 'overlay/dragEnd') {
    isDragging = false;
  }

  if (message.type === 'overlay/dragToggleMinimapPrompt') {
    dragShowMinimapPrompt = message.display;
  }

  if (message.type === 'overlay/dragStartMinimapTransition') {
    dragMinimapTransition = true;
  }

  if (message.type === 'overlay/dragEndMinimapTransition') {
    dragMinimapTransition = false;
  }

  if (message.type === 'overlay/dragUpdateGroupRect') {
    dragGroupRect = message.groupRect;
  }

  if (message.type === 'overlay/dragToggleMinimap') {
    dragShowMinimap = message.display;
  }

  return {
    ...state,
    contextMenu,
    dragGroupRect,
    dragInsertPosition,
    dragMinimapTransition,
    dragShowMinimap,
    dragShowMinimapPrompt,
    dragSkeleton,
    elements: elementsReducer(state.elements, message),
    focusPath,
    isDragging,
    perspective,
    wasMaybeCollapsed,
  };
}

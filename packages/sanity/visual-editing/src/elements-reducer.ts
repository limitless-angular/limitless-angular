import type { VisualEditingControllerMsg } from '@sanity/presentation-comlink';

import type { ElementState, OverlayMsg } from './types';

export function elementsReducer(
  elements: ElementState[],
  message: OverlayMsg | VisualEditingControllerMsg,
): ElementState[] {
  switch (message.type) {
    case 'element/register': {
      const elementExists = elements.some(
        (element) => element.id === message.id,
      );
      if (elementExists) {
        return elements;
      }

      return [
        ...elements,
        {
          id: message.id,
          activated: false,
          element: message.element,
          focused: false,
          hovered: false,
          rect: message.rect,
          sanity: message.sanity,
          dragDisabled: message.dragDisabled,
        },
      ];
    }
    case 'element/activate':
      return elements.map((element) =>
        element.id === message.id ? { ...element, activated: true } : element,
      );
    case 'element/update':
      return elements.map((element) =>
        element.id === message.id
          ? { ...element, sanity: message.sanity, rect: message.rect }
          : element,
      );
    case 'element/unregister':
      return elements.filter((element) => element.id !== message.id);
    case 'element/deactivate':
      return elements.map((element) =>
        element.id === message.id
          ? { ...element, activated: false, hovered: false }
          : element,
      );
    case 'element/mouseenter':
      return elements.map((element) =>
        element.id === message.id
          ? { ...element, rect: message.rect, hovered: true }
          : { ...element, hovered: false },
      );
    case 'element/mouseleave':
      return elements.map((element) =>
        element.id === message.id ? { ...element, hovered: false } : element,
      );
    case 'element/updateRect':
      return elements.map((element) =>
        element.id === message.id
          ? { ...element, rect: message.rect }
          : element,
      );
    case 'element/click':
      return elements.map((element) => ({
        ...element,
        focused: element.id === message.id && 'clicked',
      }));
    case 'overlay/blur':
    case 'presentation/blur':
      return elements.map((element) => ({ ...element, focused: false }));
    case 'presentation/focus': {
      const clickedElement = elements.find(
        (element) => element.focused === 'clicked',
      );

      return elements.map((element) => {
        const focused =
          'path' in element.sanity &&
          element.sanity.id === message.data.id &&
          element.sanity.path === message.data.path;

        if (clickedElement && element === clickedElement && focused) {
          return element;
        }

        return {
          ...element,
          focused: focused && clickedElement ? 'duplicate' : focused,
        };
      });
    }
    default:
      return elements;
  }
}

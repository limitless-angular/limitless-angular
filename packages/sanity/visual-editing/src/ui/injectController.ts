import {
  createOverlayController,
  OverlayEventHandler,
  type OverlayController,
} from '@sanity/visual-editing';

export function injectController(
  element: HTMLElement,
  handler: OverlayEventHandler,
  preventDefault: boolean,
): OverlayController {
  return createOverlayController({
    handler,
    overlayElement: element,
    preventDefault,
  });
}

import type { DisableVisualEditing, VisualEditingOptions } from '../types';

export function enableVisualEditing(
  options: VisualEditingOptions = {},
): DisableVisualEditing {
  const controller = new AbortController();

  import('./render-visual-editing').then(({ renderVisualEditing }) => {
    if (controller.signal.aborted) {
      return;
    }

    renderVisualEditing(controller.signal, options);
  });

  return () => {
    controller.abort();
  };
}

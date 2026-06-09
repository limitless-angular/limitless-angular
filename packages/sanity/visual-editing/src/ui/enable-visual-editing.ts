import type {
  DisableVisualEditing,
  VisualEditingRuntimeOptions,
} from '../types';

export function enableVisualEditing(
  options: VisualEditingRuntimeOptions = {},
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

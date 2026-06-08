import type { DisableVisualEditing, VisualEditingOptions } from './types';

let pendingCleanup: ReturnType<typeof setTimeout> | undefined;
let runtime:
  | import('./visual-editing-runtime').VisualEditingRuntime
  | undefined;

export function enableVisualEditing(
  options: VisualEditingOptions = {},
): DisableVisualEditing {
  const controller = new AbortController();

  if (pendingCleanup) {
    clearTimeout(pendingCleanup);
    pendingCleanup = undefined;
  }

  import('./visual-editing-runtime').then(({ VisualEditingRuntime }) => {
    if (controller.signal.aborted) {
      return;
    }

    if (!runtime) {
      runtime = new VisualEditingRuntime(options);
      runtime.start();
    } else {
      runtime.update(options);
    }
  });

  return () => {
    controller.abort();
    pendingCleanup = setTimeout(() => {
      runtime?.destroy();
      runtime = undefined;
      pendingCleanup = undefined;
    }, 1000);
  };
}

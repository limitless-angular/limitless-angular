import { injectDraftMode } from '../../../utils/draft-mode';

export function injectDisableDraftMode() {
  const draftMode = injectDraftMode();

  return () =>
    Promise.allSettled([
      draftMode().disable(),
      // Simulate a delay to show the loading state
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ]);
}

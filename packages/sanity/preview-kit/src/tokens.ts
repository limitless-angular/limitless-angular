import { InjectionToken } from '@angular/core';

/**
 * @public
 * @deprecated Preview Kit v6 uses the Sanity Live Content API and no longer polls.
 * This token is kept as a no-op compatibility export.
 */
export const LIVE_PREVIEW_REFRESH_INTERVAL = new InjectionToken<number>(
  'LIVE_PREVIEW_REFRESH_INTERVAL',
);

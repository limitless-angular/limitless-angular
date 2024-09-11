import { InjectionToken } from '@angular/core';
import type { SanityClientFactory } from './types';

export const SANITY_CLIENT_FACTORY = new InjectionToken<SanityClientFactory>(
  'SANITY_CLIENT',
);
export const LIVE_PREVIEW_REFRESH_INTERVAL = new InjectionToken<number>('LIVE_PREVIEW_REFRESH_INTERVAL');

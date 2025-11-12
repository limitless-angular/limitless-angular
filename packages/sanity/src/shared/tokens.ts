import { InjectionToken } from '@angular/core';

import { type SanityClientFactory, type SanityConfig } from './types';

export const SANITY_CONFIG = new InjectionToken<SanityConfig>('SANITY_CONFIG');

export const SANITY_CLIENT_FACTORY = new InjectionToken<SanityClientFactory>(
  'SANITY_CLIENT',
);

import { InjectionToken } from '@angular/core';

import { SanityConfig } from './types';

export const SANITY_CONFIG = new InjectionToken<SanityConfig>('SANITY_CONFIG');

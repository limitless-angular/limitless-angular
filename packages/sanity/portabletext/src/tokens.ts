import { InjectionToken } from '@angular/core';
import { MissingComponentHandler } from './types';

export const MISSING_COMPONENT_HANDLER =
  new InjectionToken<MissingComponentHandler>('Missing Component Handler');

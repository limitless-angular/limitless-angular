import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  provideRouter,
  withExperimentalPlatformNavigation,
} from '@angular/router';
import { provideClientHydration } from '@angular/platform-browser';

import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes, withExperimentalPlatformNavigation()),
  ],
};

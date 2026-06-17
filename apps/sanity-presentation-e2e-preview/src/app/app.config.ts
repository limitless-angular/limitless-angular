import {
  type ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import {
  provideRouter,
  withExperimentalPlatformNavigation,
} from '@angular/router';

import { routes } from './app.routes';

const appProvidersBeforeRouter: NonNullable<ApplicationConfig['providers']> = [
  provideZonelessChangeDetection(),
  provideBrowserGlobalErrorListeners(),
];

const appProvidersAfterRouter: NonNullable<ApplicationConfig['providers']> = [
  provideClientHydration(withEventReplay()),
];

export const appConfig: ApplicationConfig = {
  providers: [
    ...appProvidersBeforeRouter,
    provideRouter(routes, withExperimentalPlatformNavigation()),
    ...appProvidersAfterRouter,
  ],
};

export const appServerConfig: ApplicationConfig = {
  providers: [
    ...appProvidersBeforeRouter,
    provideRouter(routes),
    ...appProvidersAfterRouter,
  ],
};

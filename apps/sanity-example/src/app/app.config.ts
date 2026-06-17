import {
  type ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  provideRouter,
  withExperimentalPlatformNavigation,
} from '@angular/router';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';

import { appRoutes } from './app.routes';

const appProviders: NonNullable<ApplicationConfig['providers']> = [
  provideClientHydration(withEventReplay()),
  provideZonelessChangeDetection(),
  provideBrowserGlobalErrorListeners(),
];

export const appConfig: ApplicationConfig = {
  providers: [
    ...appProviders,
    provideRouter(appRoutes, withExperimentalPlatformNavigation()),
  ],
};

export const appServerConfig: ApplicationConfig = {
  providers: [...appProviders, provideRouter(appRoutes)],
};

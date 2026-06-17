import {
  type ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideEnvironmentInitializer,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import {
  withComponentInputBinding,
  withExperimentalPlatformNavigation,
  withNavigationErrorHandler,
} from '@angular/router';

import { provideFileRouter } from '@analogjs/router';
import { provideSanity, withLivePreview } from '@limitless-angular/sanity';

import { getClient } from '@/analog-sanity-blog-example/sanity';
import { updateMetaTagsOnRouteChange } from './utils/meta-tags';

const appProvidersBeforeRouter: NonNullable<ApplicationConfig['providers']> = [
  provideZonelessChangeDetection(),
  provideBrowserGlobalErrorListeners(),
];

const appProvidersAfterRouter: NonNullable<ApplicationConfig['providers']> = [
  provideClientHydration(),
  provideHttpClient(withFetch()),
  provideSanity(getClient, withLivePreview()),
  provideEnvironmentInitializer(() => updateMetaTagsOnRouteChange()),
];

export const appConfig: ApplicationConfig = {
  providers: [
    ...appProvidersBeforeRouter,
    provideFileRouter(
      withComponentInputBinding(),
      withExperimentalPlatformNavigation(),
      withNavigationErrorHandler(console.error),
    ),
    ...appProvidersAfterRouter,
  ],
};

export const appServerConfig: ApplicationConfig = {
  providers: [
    ...appProvidersBeforeRouter,
    provideFileRouter(
      withComponentInputBinding(),
      withNavigationErrorHandler(console.error),
    ),
    ...appProvidersAfterRouter,
  ],
};

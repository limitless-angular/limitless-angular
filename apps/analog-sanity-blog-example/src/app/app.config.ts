import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideEnvironmentInitializer,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
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

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideFileRouter(
      withComponentInputBinding(),
      withExperimentalPlatformNavigation(),
      withNavigationErrorHandler(console.error),
    ),
    provideClientHydration(),
    provideHttpClient(),
    provideSanity(getClient, withLivePreview()),
    provideEnvironmentInitializer(() => updateMetaTagsOnRouteChange()),
  ],
};

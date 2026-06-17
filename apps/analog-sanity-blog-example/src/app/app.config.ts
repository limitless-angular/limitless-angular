import {
  type ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideEnvironmentInitializer,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import {
  provideClientHydration,
  withNoIncrementalHydration,
} from '@angular/platform-browser';
import {
  withComponentInputBinding,
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
      withNavigationErrorHandler(console.error),
    ),
    provideClientHydration(withNoIncrementalHydration()),
    provideHttpClient(withFetch()),
    provideSanity(getClient, withLivePreview()),
    provideEnvironmentInitializer(() => updateMetaTagsOnRouteChange()),
  ],
};

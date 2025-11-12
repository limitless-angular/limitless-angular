import {
  type ApplicationConfig,
  provideZonelessChangeDetection,
  provideEnvironmentInitializer,
} from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import {
  withComponentInputBinding,
  withNavigationErrorHandler,
} from '@angular/router';

import { provideFileRouter } from '@analogjs/router';
import { provideSanity, withLivePreview } from '@limitless-angular/sanity';

import { getClient } from '#sanity';
import { updateMetaTagsOnRouteChange } from './utils/meta-tags';

console.log('getClient', getClient, withLivePreview);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideFileRouter(
      withComponentInputBinding(),
      withNavigationErrorHandler(console.error),
    ),
    provideClientHydration(),
    provideHttpClient(withFetch()),
    provideSanity(getClient, withLivePreview()),
    provideEnvironmentInitializer(() => updateMetaTagsOnRouteChange()),
  ],
};

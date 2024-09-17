import {
  type ApplicationConfig,
  ENVIRONMENT_INITIALIZER,
  provideExperimentalZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
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
    provideExperimentalZonelessChangeDetection(),
    provideFileRouter(
      withComponentInputBinding(),
      withNavigationErrorHandler(console.error),
    ),
    provideClientHydration(),
    provideHttpClient(withFetch()),
    provideSanity(getClient, withLivePreview()),
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useValue: () => updateMetaTagsOnRouteChange(),
    },
  ],
};

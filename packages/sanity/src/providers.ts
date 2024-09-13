import {
  ENVIRONMENT_INITIALIZER,
  type EnvironmentProviders,
  makeEnvironmentProviders,
  type Provider,
} from '@angular/core';

import { LIVE_PREVIEW_REFRESH_INTERVAL } from '@limitless-angular/sanity/preview-kit';

import {
  SANITY_CLIENT_FACTORY,
  type SanityClientFactory,
} from '@limitless-angular/sanity/shared';

const DEFAULT_LIVE_PREVIEW_REFRESH_INTERVAL = 10000;

export interface LivePreviewOptions {
  refreshInterval?: number;
}

export function provideSanity(
  factory: SanityClientFactory,
  ...features: SanityFeatures[]
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: SANITY_CLIENT_FACTORY, useValue: factory },
    {
      provide: ENVIRONMENT_INITIALIZER,
      multi: true,
      useValue: () => {
        // This is a placeholder for any initialization logic you might need.
        // For example, you could set up global error handling for Sanity queries here.
      },
    },
    features.map((feature) => feature.ɵproviders),
  ]);
}

export interface SanityFeature<FeatureKind extends SanityFeatureKind> {
  ɵkind: FeatureKind;
  ɵproviders: Provider[];
}

function sanityFeature<FeatureKind extends SanityFeatureKind>(
  kind: FeatureKind,
  providers: Provider[],
): SanityFeature<FeatureKind> {
  return { ɵkind: kind, ɵproviders: providers };
}

export type SanityLivePreviewFeature =
  SanityFeature<SanityFeatureKind.SanityLivePreviewFeature>;

export function withLivePreview(
  options: LivePreviewOptions = {},
): SanityLivePreviewFeature {
  const providers = [
    {
      provide: LIVE_PREVIEW_REFRESH_INTERVAL,
      useValue:
        options.refreshInterval ?? DEFAULT_LIVE_PREVIEW_REFRESH_INTERVAL,
    },
  ];
  return sanityFeature(SanityFeatureKind.SanityLivePreviewFeature, providers);
}

export type SanityFeatures = SanityLivePreviewFeature;

export const enum SanityFeatureKind {
  SanityLivePreviewFeature,
}

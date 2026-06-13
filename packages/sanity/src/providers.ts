import {
  ENVIRONMENT_INITIALIZER,
  type EnvironmentProviders,
  makeEnvironmentProviders,
  type Provider,
} from '@angular/core';

import {
  SANITY_CLIENT_FACTORY,
  SANITY_CONFIG,
  type SanityClientFactory,
  type SanityConfig,
} from '@limitless-angular/sanity/shared';

export function provideSanity(
  factoryOrConfig: SanityClientFactory | SanityConfig,
  ...features: SanityFeatures[]
): EnvironmentProviders {
  return makeEnvironmentProviders([
    ...(typeof factoryOrConfig === 'function'
      ? [
          { provide: SANITY_CLIENT_FACTORY, useValue: factoryOrConfig },
          { provide: SANITY_CONFIG, useValue: factoryOrConfig()?.config() },
        ]
      : [{ provide: SANITY_CONFIG, useValue: factoryOrConfig }]),
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

export function withLivePreview(): SanityLivePreviewFeature {
  return sanityFeature(SanityFeatureKind.SanityLivePreviewFeature, []);
}

export type SanityFeatures = SanityLivePreviewFeature;

export const enum SanityFeatureKind {
  SanityLivePreviewFeature,
}

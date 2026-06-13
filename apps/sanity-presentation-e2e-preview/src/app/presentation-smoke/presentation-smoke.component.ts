import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { createClient } from '@sanity/client';
import type {
  ContentSourceMap,
  LiveEvent,
  QueryParams,
  SanityClient,
  SanityDocument,
} from '@sanity/client';
import { EMPTY, Observable } from 'rxjs';

import {
  createLiveData,
  LIVE_PREVIEW_REFRESH_INTERVAL,
  LiveQueryProviderComponent,
} from '@limitless-angular/sanity/preview-kit';
import {
  SANITY_CLIENT_FACTORY,
  SANITY_CONFIG,
} from '@limitless-angular/sanity/shared';
import {
  createDataAttribute,
  VisualEditingComponent,
} from '@limitless-angular/sanity/visual-editing';

import {
  getPresentationSmokeClientConfig,
  getPresentationSmokeConfig,
  presentationSmokeDocumentId,
  presentationSmokeInitialTitle,
  presentationSmokeLiveTitle,
  presentationSmokeQuery,
  presentationSmokeSyncTag,
  type PresentationSmokeConfig,
  type PresentationSmokeDocument,
} from './presentation-smoke-config';

type PresentationSmokeFrameState = Window & {
  __presentationSmokeBootCount?: number;
  __presentationSmokeEmitLiveEvent?: () => void;
  __presentationSmokeFetchCount?: number;
  __presentationSmokeLiveEventId?: number;
  __presentationSmokePerspective?: unknown;
  __presentationSmokeTitle?: string;
};

const sourceMap = {
  documents: [{ _id: presentationSmokeDocumentId, _type: 'post' }],
  mappings: {},
  paths: [],
} as unknown as ContentSourceMap;

const fakeClient = {
  config: () => getPresentationSmokeClientConfig(),
  fetch: async (
    _query: string,
    _params?: QueryParams,
    options?: { perspective?: unknown },
  ) => {
    const smokeWindow = getPresentationSmokeWindow();

    if (smokeWindow) {
      smokeWindow.__presentationSmokeFetchCount =
        (smokeWindow.__presentationSmokeFetchCount ?? 0) + 1;
      smokeWindow.__presentationSmokePerspective = options?.perspective;
    }

    return {
      result: { title: getPresentationSmokeTitle() },
      resultSourceMap: sourceMap,
      syncTags: [presentationSmokeSyncTag],
    };
  },
  getDocuments: async (ids: string[]) =>
    ids.map(
      (id) =>
        ({
          _createdAt: '2024-01-01T00:00:00.000Z',
          _id: id,
          _rev: 'presentation-smoke-rev',
          _type: 'post',
          _updatedAt: '2024-01-01T00:00:00.000Z',
          title: getPresentationSmokeTitle(),
        }) as SanityDocument,
    ),
  listen: () => EMPTY,
  live: {
    events: () =>
      new Observable<LiveEvent>((observer) => {
        observer.next({ type: 'welcome' });

        const smokeWindow = getPresentationSmokeWindow();
        if (!smokeWindow) {
          return undefined;
        }

        const emitLiveEvent = () => {
          smokeWindow.__presentationSmokeLiveEventId =
            (smokeWindow.__presentationSmokeLiveEventId ?? 0) + 1;
          observer.next({
            id: `presentation-smoke-${smokeWindow.__presentationSmokeLiveEventId}`,
            tags: [presentationSmokeSyncTag],
            type: 'message',
          });
        };

        smokeWindow.__presentationSmokeEmitLiveEvent = emitLiveEvent;

        return () => {
          if (smokeWindow.__presentationSmokeEmitLiveEvent === emitLiveEvent) {
            delete smokeWindow.__presentationSmokeEmitLiveEvent;
          }
        };
      }),
  },
  withConfig: () => fakeClient,
} as unknown as SanityClient;

function getSmokeClient(preview?: { token: string }): SanityClient {
  const config = getPresentationSmokeConfig();

  if (config.mode === 'fake-client') {
    return fakeClient;
  }

  return createClient({
    ...getPresentationSmokeClientConfig(config),
    ignoreBrowserTokenWarning: true,
    token: preview?.token ?? config.token,
  });
}

function getPresentationSmokeWindow(): PresentationSmokeFrameState | undefined {
  return typeof window === 'undefined'
    ? undefined
    : (window as PresentationSmokeFrameState);
}

function getPresentationSmokeTitle(): string {
  return (
    getPresentationSmokeWindow()?.__presentationSmokeTitle ??
    presentationSmokeLiveTitle
  );
}

function getInitialDocument(): PresentationSmokeDocument {
  const config = getPresentationSmokeConfig();

  if (config.mode === 'fake-client') {
    return {
      ...config.document,
      title: presentationSmokeInitialTitle,
    };
  }

  return config.document;
}

@Component({
  selector: 'app-presentation-smoke-content',
  template: `
    <article class="presentation-smoke">
      <p data-testid="presentation-smoke-kicker">Presentation smoke route</p>
      <h1
        [attr.data-client-mode]="config().mode"
        [attr.data-sanity]="dataSanity()"
        data-testid="presentation-smoke-title"
      >
        {{ liveData().title }}
      </h1>
    </article>
  `,
  styles: `
    .presentation-smoke {
      box-sizing: border-box;
      margin: 0 auto;
      max-width: 48rem;
      padding: 4rem 1.5rem;
    }

    p {
      color: #57534e;
      font-size: 0.875rem;
      margin: 0 0 0.75rem;
      text-transform: uppercase;
    }

    h1 {
      color: #171717;
      font-size: clamp(2rem, 6vw, 4rem);
      letter-spacing: 0;
      line-height: 1;
      margin: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PresentationSmokeContentComponent {
  config = input.required<PresentationSmokeConfig>();

  constructor() {
    const smokeWindow = getPresentationSmokeWindow();
    if (smokeWindow) {
      smokeWindow.__presentationSmokeBootCount =
        (smokeWindow.__presentationSmokeBootCount ?? 0) + 1;
    }
  }

  dataSanity = computed(() =>
    createDataAttribute({
      baseUrl: this.config().studioUrl,
      dataset: this.config().dataset,
      id: this.config().document._id,
      path: 'title',
      projectId: this.config().projectId,
      type: this.config().document._type,
    }).toString(),
  );

  liveData = createLiveData(
    () => ({ title: getInitialDocument().title }),
    () => ({
      params: { id: this.config().document._id } satisfies QueryParams,
      query: presentationSmokeQuery,
    }),
  );
}

@Component({
  selector: 'app-presentation-smoke',
  imports: [
    LiveQueryProviderComponent,
    PresentationSmokeContentComponent,
    VisualEditingComponent,
  ],
  templateUrl: './presentation-smoke.component.html',
  providers: [
    { provide: SANITY_CLIENT_FACTORY, useValue: getSmokeClient },
    { provide: SANITY_CONFIG, useFactory: getPresentationSmokeClientConfig },
    { provide: LIVE_PREVIEW_REFRESH_INTERVAL, useValue: 50 },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PresentationSmokeComponent {
  config = getPresentationSmokeConfig();
}

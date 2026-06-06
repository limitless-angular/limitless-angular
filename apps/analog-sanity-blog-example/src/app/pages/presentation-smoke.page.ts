import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { EMPTY } from 'rxjs';
import {
  type ContentSourceMap,
  type InitializedClientConfig,
  type QueryParams,
  type SanityClient,
  type SanityDocument,
} from '@sanity/client';
import { createDataAttribute } from '@sanity/visual-editing';

import {
  createLiveData,
  LIVE_PREVIEW_REFRESH_INTERVAL,
  LiveQueryProviderComponent,
} from '@limitless-angular/sanity/preview-kit';
import {
  SANITY_CLIENT_FACTORY,
  SANITY_CONFIG,
} from '@limitless-angular/sanity/shared';
import { VisualEditingComponent } from '@limitless-angular/sanity/visual-editing';
import type { PresentationSmokeLoadResult } from './presentation-smoke.server';

const projectId =
  import.meta.env.VITE_SANITY_PROJECT_ID || 'presentation-smoke-project';
const dataset =
  import.meta.env.VITE_SANITY_DATASET || 'presentation-smoke-dataset';
const studioURL =
  import.meta.env['VITE_SANITY_STUDIO_URL'] || 'http://localhost:3333';
const documentId = 'presentation-smoke-post';
const initialTitle = 'Initial presentation smoke title';
const liveTitle = 'Live presentation smoke title';
const presentationSmokeQuery = '*[_id == $id][0]{title}';

type PresentationSmokeWindow = Window & {
  __presentationSmokeBootCount?: number;
  __presentationSmokeFetchCount?: number;
  __presentationSmokeTitle?: string;
};

const sourceMap = {
  documents: [{ _id: documentId, _type: 'post' }],
  paths: [],
  mappings: {},
} as unknown as ContentSourceMap;

const clientConfig = {
  projectId,
  dataset,
  apiVersion: '2024-02-28',
  useCdn: false,
  perspective: 'previewDrafts',
  resultSourceMap: true,
} as unknown as Required<InitializedClientConfig>;

const fakeClient = {
  config: () => clientConfig,
  withConfig: () => fakeClient,
  fetch: async () => {
    const smokeWindow = getPresentationSmokeWindow();
    if (smokeWindow) {
      smokeWindow.__presentationSmokeFetchCount =
        (smokeWindow.__presentationSmokeFetchCount ?? 0) + 1;
    }

    return {
      result: { title: getPresentationSmokeTitle() },
      resultSourceMap: sourceMap,
    };
  },
  getDocuments: async (ids: string[]) =>
    ids.map(
      (id) =>
        ({
          _id: id,
          _createdAt: '2024-01-01T00:00:00.000Z',
          _rev: 'presentation-smoke-rev',
          _type: 'post',
          _updatedAt: '2024-01-01T00:00:00.000Z',
          title: getPresentationSmokeTitle(),
        }) as SanityDocument,
    ),
  listen: () => EMPTY,
} as unknown as SanityClient;

function getSmokeClient(): SanityClient {
  return fakeClient;
}

function getPresentationSmokeWindow(): PresentationSmokeWindow | undefined {
  return typeof window === 'undefined'
    ? undefined
    : (window as unknown as PresentationSmokeWindow);
}

function getPresentationSmokeTitle(): string {
  return getPresentationSmokeWindow()?.__presentationSmokeTitle ?? liveTitle;
}

@Component({
  selector: 'blog-presentation-smoke-fake-content',
  template: `
    <article class="mx-auto max-w-3xl px-6 py-16">
      <p data-testid="presentation-smoke-kicker">Presentation smoke route</p>
      <p data-testid="presentation-smoke-client-mode" hidden>fake-client</p>
      <h1
        data-testid="presentation-smoke-title"
        [attr.data-sanity]="dataSanity"
      >
        {{ liveData().title }}
      </h1>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PresentationSmokeContentComponent {
  dataSanity = createDataAttribute({
    baseUrl: studioURL,
    dataset,
    id: documentId,
    projectId,
    path: 'title',
    type: 'post',
  }).toString();

  constructor() {
    const smokeWindow = getPresentationSmokeWindow();
    if (smokeWindow) {
      smokeWindow.__presentationSmokeBootCount =
        (smokeWindow.__presentationSmokeBootCount ?? 0) + 1;
    }
  }

  liveData = createLiveData(
    () => ({ title: initialTitle }),
    () => ({
      query: presentationSmokeQuery,
      params: { id: documentId } satisfies QueryParams,
    }),
  );
}

@Component({
  selector: 'blog-presentation-smoke-fake-shell',
  imports: [
    LiveQueryProviderComponent,
    PresentationSmokeContentComponent,
    VisualEditingComponent,
  ],
  providers: [
    { provide: SANITY_CLIENT_FACTORY, useValue: getSmokeClient },
    { provide: SANITY_CONFIG, useValue: clientConfig },
    { provide: LIVE_PREVIEW_REFRESH_INTERVAL, useValue: 50 },
  ],
  template: `
    <live-query-provider token="presentation-smoke-token">
      <blog-presentation-smoke-fake-content />
    </live-query-provider>
    <visual-editing />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PresentationSmokeFakeShellComponent {}

@Component({
  selector: 'blog-presentation-smoke-real-content',
  template: `
    <article class="mx-auto max-w-3xl px-6 py-16">
      <p data-testid="presentation-smoke-kicker">Presentation smoke route</p>
      <p data-testid="presentation-smoke-client-mode" hidden>real-client</p>
      <h1
        data-testid="presentation-smoke-title"
        [attr.data-sanity]="dataSanity()"
      >
        {{ liveData().title }}
      </h1>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PresentationSmokeRealContentComponent {
  data = input.required<PresentationSmokeLoadResult>();

  constructor() {
    const smokeWindow = getPresentationSmokeWindow();
    if (smokeWindow) {
      smokeWindow.__presentationSmokeBootCount =
        (smokeWindow.__presentationSmokeBootCount ?? 0) + 1;
    }
  }

  dataSanity = computed(() =>
    createDataAttribute({
      baseUrl: this.data().studioUrl,
      dataset: this.data().dataset,
      id: this.data().document._id,
      projectId: this.data().projectId,
      path: 'title',
      type: this.data().document._type,
    }).toString(),
  );

  liveData = createLiveData(
    () => ({ title: this.data().document.title }),
    () => ({
      query: presentationSmokeQuery,
      params: { id: this.data().document._id } satisfies QueryParams,
    }),
  );
}

@Component({
  imports: [
    LiveQueryProviderComponent,
    PresentationSmokeFakeShellComponent,
    PresentationSmokeRealContentComponent,
    VisualEditingComponent,
  ],
  template: `
    @if (load().mode === 'real-client') {
      <live-query-provider [token]="load().token">
        <blog-presentation-smoke-real-content [data]="load()" />
      </live-query-provider>
      <visual-editing />
    } @else {
      <blog-presentation-smoke-fake-shell />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PresentationSmokePage {
  load = input.required<PresentationSmokeLoadResult>();
}

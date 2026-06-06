import { ChangeDetectionStrategy, Component } from '@angular/core';
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

const projectId =
  import.meta.env.VITE_SANITY_PROJECT_ID || 'presentation-smoke-project';
const dataset =
  import.meta.env.VITE_SANITY_DATASET || 'presentation-smoke-dataset';
const documentId = 'presentation-smoke-post';
const initialTitle = 'Initial presentation smoke title';
const liveTitle = 'Live presentation smoke title';

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
  fetch: async () => ({
    result: { title: liveTitle },
    resultSourceMap: sourceMap,
  }),
  getDocuments: async (ids: string[]) =>
    ids.map(
      (id) =>
        ({
          _id: id,
          _createdAt: '2024-01-01T00:00:00.000Z',
          _rev: 'presentation-smoke-rev',
          _type: 'post',
          _updatedAt: '2024-01-01T00:00:00.000Z',
          title: liveTitle,
        }) as SanityDocument,
    ),
  listen: () => EMPTY,
} as unknown as SanityClient;

function getSmokeClient(): SanityClient {
  return fakeClient;
}

@Component({
  selector: 'blog-presentation-smoke-content',
  template: `
    <article class="mx-auto max-w-3xl px-6 py-16">
      <p data-testid="presentation-smoke-kicker">Presentation smoke route</p>
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
class PresentationSmokeContentComponent {
  dataSanity = createDataAttribute({
    baseUrl: 'http://localhost:3333',
    dataset,
    id: documentId,
    projectId,
    path: 'title',
    type: 'post',
  }).toString();

  liveData = createLiveData(
    () => ({ title: initialTitle }),
    () => ({
      query: '*[_id == $id][0]{title}',
      params: { id: documentId } satisfies QueryParams,
    }),
  );
}

@Component({
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
      <blog-presentation-smoke-content />
    </live-query-provider>
    <visual-editing />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PresentationSmokePage {}

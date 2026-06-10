import {
  Injectable,
  Injector,
  computed,
  effect,
  inject,
  signal,
  type Signal,
} from '@angular/core';
import type {
  ClientPerspective,
  ClientReturn,
  ContentSourceMap,
  QueryParams,
} from '@sanity/client';
import { stegaEncodeSourceMap } from '@sanity/client/stega';
import type { LoaderControllerMsg } from '@sanity/presentation-comlink';
import { dequal } from 'dequal/lite';

import { LoaderComlinkService } from './loader-comlink.service';

export type PresentationQueryReturnsInactive = {
  data: null;
  sourceMap: null;
  perspective: null;
};

export type PresentationQueryReturnsActive<QueryString extends string> = {
  data: ClientReturn<QueryString>;
  sourceMap: ContentSourceMap | null;
  perspective: ClientPerspective;
};

export type PresentationQueryReturns<QueryString extends string> =
  | PresentationQueryReturnsInactive
  | PresentationQueryReturnsActive<QueryString>;

type MaybeSignal<T> = T | Signal<T>;

const EMPTY_QUERY_PARAMS: QueryParams = {};
const LISTEN_HEARTBEAT_INTERVAL = 10_000;

function readMaybeSignal<T>(value: MaybeSignal<T>): T {
  return typeof value === 'function' ? (value as Signal<T>)() : value;
}

@Injectable({ providedIn: 'root' })
export class PresentationQueryService {
  private injector = inject(Injector);
  private loaderComlink = inject(LoaderComlinkService);

  query<const QueryString extends string>(
    props: {
      query: MaybeSignal<QueryString>;
      params?: MaybeSignal<QueryParams | Promise<QueryParams>>;
      stega?: MaybeSignal<boolean>;
    },
    options: { injector?: Injector } = {},
  ): Signal<PresentationQueryReturns<QueryString>> {
    const injector = options.injector ?? this.injector;
    const state = signal<PresentationQueryReturns<QueryString>>({
      data: null,
      sourceMap: null,
      perspective: null,
    });

    effect(
      (onCleanup) => {
        onCleanup(this.loaderComlink.addQueryListener());
      },
      { injector },
    );

    effect(
      (onCleanup) => {
        const comlink = this.loaderComlink.comlink();
        const projectId = this.loaderComlink.projectId();
        const dataset = this.loaderComlink.dataset();
        const perspective = this.loaderComlink.perspective();
        const query = readMaybeSignal(props.query);
        const params = props.params
          ? readMaybeSignal(props.params)
          : EMPTY_QUERY_PARAMS;

        if (!comlink) {
          return;
        }

        const handleQueryHeartbeat = () => {
          if (!projectId || !dataset || !perspective) {
            return;
          }

          comlink.post('loader/query-listen', {
            projectId,
            dataset,
            perspective,
            query,
            params,
            heartbeat: LISTEN_HEARTBEAT_INTERVAL,
          });
        };

        const handleQueryChange = (
          event: Extract<
            LoaderControllerMsg,
            { type: 'loader/query-change' }
          >['data'],
        ) => {
          if (
            !dequal(
              { projectId, dataset, query, params },
              {
                projectId: event.projectId,
                dataset: event.dataset,
                query: event.query,
                params: event.params,
              },
            )
          ) {
            return;
          }

          state.update((previous) => {
            const next: PresentationQueryReturnsActive<QueryString> = {
              data: event.result as ClientReturn<QueryString>,
              sourceMap: event.resultSourceMap || null,
              perspective: event.perspective,
            };

            return dequal(previous, next)
              ? previous
              : {
                  ...previous,
                  data: dequal(previous.data, next.data)
                    ? (previous.data as ClientReturn<QueryString>)
                    : next.data,
                  sourceMap: dequal(previous.sourceMap, next.sourceMap)
                    ? previous.sourceMap
                    : next.sourceMap,
                  perspective: dequal(previous.perspective, next.perspective)
                    ? (previous.perspective as ClientPerspective)
                    : next.perspective,
                };
          });
        };

        const unsubscribe = comlink.on(
          'loader/query-change',
          handleQueryChange,
        );
        handleQueryHeartbeat();

        const interval = setInterval(
          handleQueryHeartbeat,
          LISTEN_HEARTBEAT_INTERVAL,
        );

        onCleanup(() => {
          clearInterval(interval);
          unsubscribe();
        });
      },
      { injector },
    );

    return computed(() => {
      const currentState = state();
      const stega = props.stega ? readMaybeSignal(props.stega) : true;

      if (stega && currentState.sourceMap) {
        return {
          ...currentState,
          data: stegaEncodeSourceMap(
            currentState.data,
            currentState.sourceMap,
            { enabled: true, studioUrl: '/' },
          ) as ClientReturn<QueryString>,
        };
      }

      return currentState;
    });
  }
}

export function injectPresentationQuery<
  const QueryString extends string,
>(props: {
  query: MaybeSignal<QueryString>;
  params?: MaybeSignal<QueryParams | Promise<QueryParams>>;
  stega?: MaybeSignal<boolean>;
}): Signal<PresentationQueryReturns<QueryString>> {
  const injector = inject(Injector);
  return inject(PresentationQueryService).query(props, { injector });
}

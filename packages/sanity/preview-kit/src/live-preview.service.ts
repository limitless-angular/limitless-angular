import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type {
  ClientPerspective,
  LiveEventMessage,
  QueryParams,
  RawQuerylessQueryResponse,
  SanityClient,
  SyncTag,
} from '@sanity/client';
import isEqual from 'lodash-es/isEqual';
import {
  EMPTY,
  Observable,
  Subscription,
  combineLatest,
  defer,
  from,
  of,
} from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  finalize,
  map,
  switchMap,
  tap,
} from 'rxjs/operators';

import {
  SANITY_CLIENT_FACTORY,
  type SanityClientFactory,
} from '@limitless-angular/sanity/shared';

import { LiveEventsService } from './live-query-provider/live-events.service';
import {
  LiveQueriesService,
  type LiveQueriesState,
  type LiveQueryEntry,
} from './live-query-provider/live-queries.service';
import { ShouldPauseService } from './live-query-provider/should-pause.service';
import { DEFAULT_TAG } from './live-query-provider/constants';
import { PerspectiveService } from './perspective.service';
import {
  getStableQueryParams,
  getStableQueryPerspective,
} from './query-params';
import type { LivePreviewPerspective, QueryCacheKey } from './types';

@Injectable()
export class LivePreviewService {
  private client!: SanityClient;
  private clientFactory = inject<SanityClientFactory>(SANITY_CLIENT_FACTORY);
  private destroyRef = inject(DestroyRef);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private liveEventsService = inject(LiveEventsService);
  private liveQueriesService = inject(LiveQueriesService);
  private perspectiveService = inject(PerspectiveService);
  private shouldPauseService = inject(ShouldPauseService);

  private querySubscriptions = new Map<QueryCacheKey, Subscription>();
  #isInitialized = false;

  get isInitialized(): boolean {
    return this.#isInitialized;
  }

  initialize(token?: string): void {
    if (this.#isInitialized) {
      console.warn('LivePreviewService is already initialized');
      return;
    }

    const client = this.clientFactory(token ? { token } : undefined);
    const { requestTagPrefix } = client.config();

    this.client = client.withConfig({
      requestTagPrefix: requestTagPrefix || DEFAULT_TAG,
      // Set the recommended defaults, this is a convenience to make it easier
      // to share a client config from a server component to the client component.
      ...(token && {
        token,
        useCdn: false,
        perspective: 'drafts',
        ignoreBrowserTokenWarning: true,
      }),
    });

    if (this.isBrowser) {
      this.liveEventsService.initialize(this.client);
      this.setupQuerySubscriptions();
      this.reportLiveEventErrors();
    }

    this.#isInitialized = true;
  }

  setPerspective(perspective: Exclude<ClientPerspective, 'raw'>): void {
    this.perspectiveService.setPerspective(perspective);
  }

  listenLiveQuery<QueryResult>(
    initialData: QueryResult,
    query: string,
    queryParams?: QueryParams,
    perspective: LivePreviewPerspective | null = null,
  ): Observable<QueryResult> {
    if (initialData === undefined) {
      throw new Error(
        "initialSnapshot can't be undefined, if you don't want an initial value use null instead",
      );
    }

    if (!this.isBrowser) {
      return of(initialData);
    }

    this.checkInitialization();

    const params = getStableQueryParams(queryParams);
    const stablePerspective = getStableQueryPerspective(perspective);

    return this.perspectiveService.perspective$.pipe(
      map((providerPerspective) => stablePerspective || providerPerspective),
      distinctUntilChanged(isEqual),
      switchMap((effectivePerspective) =>
        defer(() => {
          const result$ = this.liveQueriesService.observe(
            initialData,
            query,
            params,
            effectivePerspective,
          );
          const unsubscribe = this.liveQueriesService.subscribe(
            query,
            params,
            effectivePerspective,
          );

          return new Observable<QueryResult>((observer) => {
            const subscription = result$.subscribe(observer);

            return () => {
              subscription.unsubscribe();
              unsubscribe();
            };
          });
        }),
      ),
    );
  }

  private checkInitialization(): void {
    if (!this.#isInitialized) {
      throw new Error(
        'LivePreviewService is not initialized. Call initialize(token) first.',
      );
    }
  }

  private setupQuerySubscriptions(): void {
    this.liveQueriesService.queries$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((queries) => this.syncQuerySubscriptions(queries));
  }

  private syncQuerySubscriptions(queries: LiveQueriesState): void {
    for (const [key, subscription] of this.querySubscriptions.entries()) {
      if (!queries.has(key)) {
        subscription.unsubscribe();
        this.querySubscriptions.delete(key);
      }
    }

    for (const [key, entry] of queries.entries()) {
      if (!this.querySubscriptions.has(key)) {
        this.querySubscriptions.set(
          key,
          this.createQuerySubscription(key, entry),
        );
      }
    }
  }

  private createQuerySubscription(
    key: QueryCacheKey,
    entry: LiveQueryEntry,
  ): Subscription {
    let reset = this.liveEventsService.snapshot.resets;
    let skipEventIds = new Set(
      this.liveEventsService.snapshot.messages.map((message) => message.id),
    );

    return combineLatest([
      this.liveEventsService.state$,
      this.shouldPauseService.shouldPause$,
      this.liveQueriesService.observeSnapshot(key).pipe(
        map((snapshot) => snapshot?.syncTags),
        distinctUntilChanged(isEqual),
      ),
    ])
      .pipe(
        map(([liveEvents, shouldPause, syncTags]) => {
          if (liveEvents.resets !== reset) {
            reset = liveEvents.resets;
            skipEventIds = new Set(
              liveEvents.messages.map((message) => message.id),
            );
          }

          return {
            lastLiveEventId: getLastLiveEventId(
              liveEvents.messages,
              skipEventIds,
              syncTags,
            ),
            reset,
            shouldPause,
          };
        }),
        distinctUntilChanged(isEqual),
        switchMap(({ lastLiveEventId, shouldPause }) => {
          if (shouldPause) {
            return EMPTY;
          }

          return this.fetchQuery(key, entry, lastLiveEventId);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private fetchQuery(
    key: QueryCacheKey,
    entry: LiveQueryEntry,
    lastLiveEventId: string | undefined,
  ): Observable<void> {
    const controller = new AbortController();
    let fulfilled = false;

    return from(
      this.client.fetch<unknown, QueryParams>(entry.query, entry.params, {
        lastLiveEventId,
        perspective: entry.perspective,
        signal: controller.signal,
        filterResponse: false,
        returnQuery: false,
      }),
    ).pipe(
      tap((response) => {
        const { result, resultSourceMap, syncTags } =
          response as RawQuerylessQueryResponse<unknown>;

        this.liveQueriesService.update(key, result, resultSourceMap, syncTags);
        fulfilled = true;
      }),
      catchError((error) => {
        if (!isAbortError(error)) {
          console.error(error);
        }

        return EMPTY;
      }),
      finalize(() => {
        if (!fulfilled) {
          controller.abort();
        }
      }),
      map(() => undefined),
    );
  }

  private reportLiveEventErrors(): void {
    this.liveEventsService.error$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((error) => console.error(error));
  }
}

function getLastLiveEventId(
  messages: LiveEventMessage[],
  skipEventIds: Set<string>,
  syncTags: SyncTag[] | undefined,
): string | undefined {
  if (!syncTags?.length) {
    return undefined;
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (
      !skipEventIds.has(message.id) &&
      message.tags.some((tag) => syncTags.includes(tag))
    ) {
      return message.id;
    }
  }

  return undefined;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

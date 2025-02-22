import { Injectable, inject, PLATFORM_ID, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';

import {
  BehaviorSubject,
  combineLatest,
  EMPTY,
  from,
  mergeMap,
  Observable,
  of,
  takeWhile,
} from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  filter,
  finalize,
  map,
  switchMap,
  tap,
} from 'rxjs/operators';
import { LRUCache } from 'lru-cache';
import { applyPatch } from 'mendoza';
import { vercelStegaSplit } from '@vercel/stega';
import { applySourceDocuments } from '@sanity/client/csm';
import { LIVE_PREVIEW_REFRESH_INTERVAL } from './tokens';
import { QueryCacheKey, type EnhancedQuerySnapshot } from './types';
import {
  ContentSourceMap,
  QueryParams,
  SanityDocument,
  MutationEvent,
  InitializedClientConfig,
  type SanityClient,
} from '@sanity/client';
import { RevalidateService } from './revalidate.service';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { UseDocumentsInUseService } from '@limitless-angular/sanity/preview-kit-compat';
import { SANITY_CLIENT_FACTORY } from '@limitless-angular/sanity/shared';

const DEFAULT_TAG = 'sanity.preview-kit';

function getTurboCacheKey(
  projectId: string,
  dataset: string,
  _id: string,
): `${string}-${string}-${string}` {
  return `${projectId}-${dataset}-${_id}`;
}

/** @internal */
function getQueryCacheKey(query: string, params: QueryParams): QueryCacheKey {
  return `${query}-${JSON.stringify(params)}`;
}

/**
 * Return params that are stable with deep equal as long as the key order is the same
 *
 * Based on https://github.com/sanity-io/visual-editing/blob/main/packages/visual-editing-helpers/src/hooks/useQueryParams.ts
 * @internal
 */
function getStableQueryParams(
  params?: undefined | null | QueryParams,
): QueryParams {
  return JSON.parse(JSON.stringify(params ?? {}));
}

@Injectable()
export class LivePreviewService {
  private client!: SanityClient;
  private clientFactory = inject(SANITY_CLIENT_FACTORY);
  private destroyRef = inject(DestroyRef);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private refreshInterval = inject(LIVE_PREVIEW_REFRESH_INTERVAL);
  private revalidateService = inject(RevalidateService);
  private useDocumentsInUse = inject(UseDocumentsInUseService);

  private config!: Required<InitializedClientConfig>;
  private snapshots = new Map<
    QueryCacheKey,
    BehaviorSubject<EnhancedQuerySnapshot<unknown>>
  >();
  private documentsCache!: LRUCache<string, SanityDocument>;
  private docsInUse = new Map<string, ContentSourceMap['documents'][number]>();
  private lastMutatedDocumentId$ = new BehaviorSubject<string | null>(null);
  private turboIds$ = new BehaviorSubject<string[]>([]);
  #isInitialized = false;
  private warnedAboutCrossDatasetReference = false;

  get isInitialized(): boolean {
    return this.#isInitialized;
  }

  initialize(token: string): void {
    if (this.#isInitialized) {
      console.warn('LiveStoreService is already initialized');
      return;
    }

    const client = this.clientFactory({ token });
    const { requestTagPrefix, resultSourceMap } = client.config();

    this.client = client.withConfig({
      requestTagPrefix: requestTagPrefix ?? DEFAULT_TAG,
      resultSourceMap:
        resultSourceMap === 'withKeyArraySelector'
          ? 'withKeyArraySelector'
          : true,
      // Set the recommended defaults, this is a convenience to make it easier to share a client config from a server component to the client component
      ...(token && {
        token,
        useCdn: false,
        perspective: 'previewDrafts',
        ignoreBrowserTokenWarning: true,
      }),
    });
    this.config = this.client.config() as Required<InitializedClientConfig>;

    this.documentsCache = new LRUCache<string, SanityDocument>({ max: 500 });

    if (this.isBrowser) {
      this.useDocumentsInUse.initialize(this.config);
      this.setupTurboUpdates();
      this.loadMissingDocuments();
      this.revalidateService.setupRevalidate(this.refreshInterval);
      this.setupSourceMapUpdates();
      this.updateActiveDocumentIds();
      this.syncWithPresentationToolIfPresent();
    }

    this.#isInitialized = true;
  }

  private checkInitialization(): void {
    if (!this.#isInitialized) {
      throw new Error(
        'LiveStoreService is not initialized. Call initialize(token) first.',
      );
    }
  }

  private turboIdsFromSourceMap(resultSourceMap: ContentSourceMap) {
    const nextTurboIds = new Set<string>();
    this.docsInUse.clear();
    if (resultSourceMap?.documents?.length) {
      for (const document of resultSourceMap.documents) {
        nextTurboIds.add(document._id);
        this.docsInUse.set(document._id, document);
      }
    }

    const prevTurboIds = this.turboIds$.getValue();
    const mergedTurboIds = Array.from(
      new Set([...prevTurboIds, ...nextTurboIds]),
    );
    if (
      JSON.stringify(mergedTurboIds.sort()) !==
      JSON.stringify(prevTurboIds.sort())
    ) {
      this.turboIds$.next(mergedTurboIds);
    }
  }

  private turboChargeResultIfSourceMap(
    result: unknown,
    resultSourceMap?: ContentSourceMap,
  ): unknown {
    if (!resultSourceMap) {
      return result;
    }

    return applySourceDocuments(
      result,
      resultSourceMap,
      (sourceDocument) => {
        if (sourceDocument._projectId) {
          // @TODO Handle cross dataset references
          if (!this.warnedAboutCrossDatasetReference) {
            console.warn(
              'Cross dataset references are not supported yet, ignoring source document',
              sourceDocument,
            );
            this.warnedAboutCrossDatasetReference = true;
          }
          return undefined;
        }
        return this.documentsCache.get(
          getTurboCacheKey(
            this.config.projectId,
            this.config.dataset,
            sourceDocument._id,
          ),
        );
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (changedValue: any, { previousValue }) => {
        if (
          typeof changedValue === 'string' &&
          typeof previousValue === 'string'
        ) {
          const { encoded } = vercelStegaSplit(previousValue);
          const { cleaned } = vercelStegaSplit(changedValue);
          return `${encoded}${cleaned}`;
        }
        return changedValue;
      },
      'previewDrafts',
    );
  }

  listenLiveQuery<QueryResult>(
    initialData: QueryResult,
    query: string,
    queryParams?: QueryParams,
  ): Observable<QueryResult> {
    if (!this.isBrowser) {
      return of(initialData);
    }

    this.checkInitialization();

    const params = getStableQueryParams(queryParams);
    const key = getQueryCacheKey(query, params);
    let snapshot = this.snapshots.get(key) as
      | BehaviorSubject<EnhancedQuerySnapshot<QueryResult>>
      | undefined;

    if (!snapshot) {
      snapshot = new BehaviorSubject<EnhancedQuerySnapshot<QueryResult>>({
        result: initialData ?? (null as unknown as QueryResult),
        resultSourceMap: {} as ContentSourceMap,
        query,
        params,
      });
      this.snapshots.set(
        key,
        snapshot as BehaviorSubject<EnhancedQuerySnapshot<unknown>>,
      );
    }

    if (!snapshot.observed) {
      this.handleRevalidation(snapshot);
    }

    return snapshot.pipe(
      map((snapshot) => snapshot.result),
      distinctUntilChanged(),
    );
  }

  private handleRevalidation<QueryResult>(
    snapshot: BehaviorSubject<EnhancedQuerySnapshot<QueryResult>>,
  ) {
    const { query, params } = snapshot.getValue();
    this.revalidateService
      .getRevalidateState()
      .pipe(
        map((state) => state === 'refresh' || state === 'inflight'),
        distinctUntilChanged(),
        filter(Boolean),
        switchMap(() => this.fetchQuery(query, params)),
        takeWhile(() => snapshot.observed),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private fetchQuery(query: string, params: QueryParams): Observable<void> {
    const onFinally = this.revalidateService.startRefresh();
    const controller = new AbortController();
    return from(
      this.client.fetch(query, params, {
        signal: controller.signal,
        filterResponse: false,
      }),
    ).pipe(
      tap(({ result, resultSourceMap }) => {
        this.updateSnapshot(query, params, result, resultSourceMap);
        if (resultSourceMap) {
          this.turboIdsFromSourceMap(resultSourceMap);
        }
      }),
      catchError((error) => {
        if (error.name !== 'AbortError') {
          // Here you might want to implement error handling
          console.error(error);
        }
        return EMPTY;
      }),
      finalize(onFinally),
      map(() => undefined),
    );
  }

  private updateSnapshot(
    query: string,
    params: QueryParams,
    result: unknown,
    resultSourceMap?: ContentSourceMap,
  ): void {
    const key = getQueryCacheKey(query, params);
    const snapshot = this.snapshots.get(key);
    if (snapshot) {
      snapshot.next({
        ...snapshot.getValue(),
        result: this.turboChargeResultIfSourceMap(result, resultSourceMap),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        resultSourceMap: resultSourceMap!,
      });
    }
  }

  private setupTurboUpdates() {
    this.client
      .listen(
        '*',
        {},
        {
          events: ['mutation'],
          effectFormat: 'mendoza',
          includePreviousRevision: false,
          includeResult: false,
          tag: 'turbo',
        },
      )
      .pipe(
        filter(
          (update): update is MutationEvent =>
            update.type === 'mutation' &&
            (update.effects?.apply?.length ?? 0) > 0,
        ),
        tap((update) => {
          const key = getTurboCacheKey(
            this.config.projectId,
            this.config.dataset,
            update.documentId,
          );
          const cachedDocument = this.documentsCache.peek(key);
          if (cachedDocument) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const patchDoc = { ...cachedDocument } as any;
            delete patchDoc._rev;
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const patchedDocument = applyPatch(patchDoc, update.effects!.apply);
            this.documentsCache.set(key, patchedDocument);
          }
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((update) => {
        this.lastMutatedDocumentId$.next(update.documentId);
      });
  }

  private setupSourceMapUpdates(): void {
    combineLatest([this.lastMutatedDocumentId$, this.turboIds$])
      .pipe(
        filter(
          ([lastMutatedDocumentId, turboIds]) =>
            !!lastMutatedDocumentId && turboIds.includes(lastMutatedDocumentId),
        ),
        switchMap(() => this.updateAllSnapshots()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.lastMutatedDocumentId$.next(null);
      });
  }

  private updateActiveDocumentIds(): void {
    this.turboIds$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((turboIds) => {
        const nextTurboIds = new Set<string>();
        this.docsInUse.clear();
        for (const snapshot of this.snapshots.values()) {
          if (snapshot.observed) {
            const { resultSourceMap } = snapshot.getValue();
            if (resultSourceMap?.documents?.length) {
              for (const document of resultSourceMap.documents) {
                nextTurboIds.add(document._id);
                this.docsInUse.set(document._id, document);
              }
            }
          }
        }

        const nextTurboIdsSnapshot = [...nextTurboIds].sort();
        if (JSON.stringify(turboIds) !== JSON.stringify(nextTurboIdsSnapshot)) {
          this.turboIds$.next(nextTurboIdsSnapshot);
        }
      });
  }

  private syncWithPresentationToolIfPresent(): void {
    this.turboIds$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.useDocumentsInUse.updateDocumentsInUse(this.docsInUse);
    });
  }

  private updateAllSnapshots(): Observable<void> {
    for (const [, snapshot] of this.snapshots.entries()) {
      const currentSnapshot = snapshot.getValue();
      if (currentSnapshot.resultSourceMap?.documents?.length) {
        const updatedResult = this.turboChargeResultIfSourceMap(
          currentSnapshot.result,
          currentSnapshot.resultSourceMap,
        );
        snapshot.next({
          ...currentSnapshot,
          result: updatedResult,
        });
      }
    }

    return EMPTY;
  }

  private loadMissingDocuments() {
    const { projectId, dataset } = this.config;
    const documentsCache = this.documentsCache;
    const batch$ = new BehaviorSubject<string[][]>([]);
    combineLatest([batch$, this.turboIds$])
      .pipe(
        map(([batch, turboIds]) => {
          const batchSet = new Set(batch.flat());
          const nextBatch = new Set<string>();
          for (const turboId of turboIds) {
            if (
              !batchSet.has(turboId) &&
              !documentsCache.has(getTurboCacheKey(projectId, dataset, turboId))
            ) {
              nextBatch.add(turboId);
            }
          }

          return [...nextBatch].slice(0, 100);
        }),
        filter((nextBatchSlice) => !!nextBatchSlice.length),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((nextBatchSlice) => {
        const prevBatch = batch$.getValue();
        batch$.next([...prevBatch.slice(-100), nextBatchSlice]);
      });

    batch$
      .pipe(
        switchMap((batches) => from(batches)),
        mergeMap((ids) => {
          const missingIds = ids.filter(
            (id) =>
              !documentsCache.has(getTurboCacheKey(projectId, dataset, id)),
          );
          if (missingIds.length === 0) {
            return EMPTY;
          }

          return from(this.client.getDocuments(missingIds)).pipe(
            tap((documents) => {
              for (const doc of documents) {
                if (doc && doc._id) {
                  documentsCache.set(
                    getTurboCacheKey(projectId, dataset, doc._id),
                    doc,
                  );
                }
              }
            }),
            catchError((error) => {
              console.error('Error loading documents:', error);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}

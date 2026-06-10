import { Injectable } from '@angular/core';
import type { ContentSourceMap, QueryParams, SyncTag } from '@sanity/client';
import isEqual from 'lodash-es/isEqual';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import type {
  EnhancedQuerySnapshot,
  LivePreviewPerspective,
  QueryCacheKey,
  QuerySnapshot,
} from '../types';
import { getQueryCacheKey } from './utils';

export type OnStoreChange = () => void;

export interface LiveQueryEntry {
  query: string;
  params: QueryParams;
  perspective: LivePreviewPerspective;
  listeners: number;
}

export type LiveQueriesState = Map<QueryCacheKey, LiveQueryEntry>;

export type LiveSnapshots = Map<QueryCacheKey, QuerySnapshot<unknown>>;

export type LiveQueriesUpdate = (
  key: QueryCacheKey,
  result: unknown,
  resultSourceMap: ContentSourceMap | null | undefined,
  syncTags: SyncTag[] | undefined,
) => boolean;

export const initialQueries: LiveQueriesState = new Map();

@Injectable()
export class LiveQueriesService {
  private queriesSubject = new BehaviorSubject<LiveQueriesState>(
    initialQueries,
  );
  private snapshots: LiveSnapshots = new Map();
  private snapshotSubjects = new Map<
    QueryCacheKey,
    BehaviorSubject<QuerySnapshot<unknown>>
  >();

  readonly queries$ = this.queriesSubject.asObservable();

  get queries(): LiveQueriesState {
    return this.queriesSubject.value;
  }

  subscribe(
    query: string,
    params: QueryParams,
    perspective: LivePreviewPerspective,
  ): () => void {
    const key = getQueryCacheKey(query, params, perspective);
    const nextQueries = new Map(this.queriesSubject.value);
    const value = nextQueries.get(key);

    nextQueries.set(key, {
      query,
      params,
      perspective,
      listeners: (value?.listeners ?? 0) + 1,
    });
    this.queriesSubject.next(nextQueries);

    return () => {
      const current = this.queriesSubject.value.get(key);
      if (!current) {
        return;
      }

      const next = new Map(this.queriesSubject.value);
      if (current.listeners <= 1) {
        next.delete(key);
      } else {
        next.set(key, { ...current, listeners: current.listeners - 1 });
      }
      this.queriesSubject.next(next);
    };
  }

  observe<QueryResult>(
    initialSnapshot: QueryResult,
    query: string,
    params: QueryParams,
    perspective: LivePreviewPerspective,
  ): Observable<QueryResult> {
    const key = getQueryCacheKey(query, params, perspective);
    return this.getSnapshotSubject(
      key,
      initialSnapshot,
      query,
      params,
      perspective,
    ).pipe(
      map((snapshot) => snapshot.result as QueryResult),
      distinctUntilChanged(isEqual),
    );
  }

  observeSnapshot(
    key: QueryCacheKey,
  ): Observable<QuerySnapshot<unknown> | undefined> {
    const subject = this.snapshotSubjects.get(key);
    if (subject) {
      return subject.asObservable();
    }

    return new Observable((observer) => {
      observer.next(this.snapshots.get(key));
      observer.complete();
    });
  }

  getSnapshot(key: QueryCacheKey): QuerySnapshot<unknown> | undefined {
    return this.snapshots.get(key);
  }

  update: LiveQueriesUpdate = (key, result, resultSourceMap, syncTags) => {
    const prev = this.snapshots.get(key);
    const next: QuerySnapshot<unknown> = {
      result: isEqual(prev?.result, result) ? prev?.result : result,
      resultSourceMap: isEqual(prev?.resultSourceMap, resultSourceMap)
        ? prev?.resultSourceMap
        : resultSourceMap,
      syncTags: isEqual(prev?.syncTags, syncTags) ? prev?.syncTags : syncTags,
    };

    if (prev && isEqual(prev, next)) {
      return false;
    }

    this.snapshots.set(key, next);
    this.snapshotSubjects.get(key)?.next(next);
    return true;
  };

  private getSnapshotSubject<QueryResult>(
    key: QueryCacheKey,
    initialSnapshot: QueryResult,
    query: string,
    params: QueryParams,
    perspective: LivePreviewPerspective,
  ): BehaviorSubject<EnhancedQuerySnapshot<QueryResult>> {
    let subject = this.snapshotSubjects.get(key) as
      | BehaviorSubject<EnhancedQuerySnapshot<QueryResult>>
      | undefined;

    if (!subject) {
      const snapshot: EnhancedQuerySnapshot<QueryResult> = {
        result: initialSnapshot,
        resultSourceMap: undefined,
        syncTags: undefined,
        query,
        params,
        perspective,
      };
      subject = new BehaviorSubject(snapshot);
      this.snapshotSubjects.set(
        key,
        subject as unknown as BehaviorSubject<QuerySnapshot<unknown>>,
      );
    } else if (!this.snapshots.has(key)) {
      subject.next({
        result: initialSnapshot,
        resultSourceMap: undefined,
        syncTags: undefined,
        query,
        params,
        perspective,
      });
    }

    return subject;
  }
}

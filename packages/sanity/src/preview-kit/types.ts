import type { ContentSourceMap, QueryParams } from '@sanity/client';

export interface QuerySnapshot<T> {
  result: T;
  resultSourceMap: ContentSourceMap;
}

export interface EnhancedQuerySnapshot<T> extends QuerySnapshot<T> {
  query: string;
  params: QueryParams;
}

/** @internal */
export type QueryCacheKey = `${string}-${string}`;

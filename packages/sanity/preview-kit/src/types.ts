import type {
  ClientPerspective,
  ContentSourceMap,
  QueryParams,
  SyncTag,
} from '@sanity/client';

/** @public */
export type LivePreviewPerspective = Exclude<ClientPerspective, 'raw'>;

export interface QuerySnapshot<T> {
  result: T;
  resultSourceMap: ContentSourceMap | null | undefined;
  syncTags: SyncTag[] | undefined;
}

export interface EnhancedQuerySnapshot<T> extends QuerySnapshot<T> {
  query: string;
  params: QueryParams;
  perspective: LivePreviewPerspective;
}

/** @internal */
export type QueryCacheKey = `${string}:${string}`;

/** @public */
export type QueryLoading = boolean;

/** @public */
export type QueryEnabled = boolean;

/**
 * Specify a `console.log` compatible logger to aid debugging.
 * @public
 */
export type Logger =
  | typeof console
  | Pick<typeof console, 'warn' | 'error' | 'log'>;

/**
 * @public
 * @deprecated these options are no longer used
 */
export interface CacheOptions {
  /**
   * Uses the Sanity Live Content API to stream updates.
   * @defaultValue true
   */
  listen?: boolean;
  /**
   * @deprecated no longer used
   */
  maxDocuments?: number;
  /**
   * @deprecated no longer used
   */
  includeTypes?: string[];
}

/** @public */
export interface LiveQueryConfig {
  query: string;
  params?: QueryParams;
  perspective?: LivePreviewPerspective | null;
}

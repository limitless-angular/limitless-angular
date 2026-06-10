import type { QueryParams } from '@sanity/client';

import type { LivePreviewPerspective, QueryCacheKey } from '../types';

/**
 * Cache key format: `query:{"params":...,"perspective":...}`
 * @internal
 */
export function getQueryCacheKey(
  query: string,
  params: QueryParams,
  perspective: LivePreviewPerspective,
): QueryCacheKey {
  return `${query}:${JSON.stringify({ params, perspective })}`;
}

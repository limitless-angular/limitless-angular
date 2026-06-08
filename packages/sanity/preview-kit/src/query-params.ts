import type { QueryParams } from '@sanity/client';

import type { QueryCacheKey } from './types';

/** @internal */
export function getQueryCacheKey(
  query: string,
  params: QueryParams,
): QueryCacheKey {
  return `${query}-${JSON.stringify(params)}`;
}

/**
 * Return params that are stable with deep equal as long as the key order is the same.
 *
 * Based on https://github.com/sanity-io/preview-kit/blob/v5.2.5/packages/preview-kit/src/hooks.ts#L104-L111
 * @internal
 */
export function normalizeQueryParams(
  params?: undefined | null | QueryParams,
): QueryParams {
  return JSON.parse(JSON.stringify(params || {}));
}

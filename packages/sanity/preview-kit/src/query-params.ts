import type { QueryParams } from '@sanity/client';

import type { LivePreviewPerspective } from './types';

/**
 * Return params that are stable with deep equal as long as the key order is the same.
 *
 * Based on https://github.com/sanity-io/preview-kit/blob/v6.2.0/packages/preview-kit/src/hooks.ts#L106-L113
 * @internal
 */
export function getStableQueryParams(
  params?: undefined | null | QueryParams,
): QueryParams {
  return JSON.parse(JSON.stringify(params || {}));
}

/**
 * Return perspective that is stable with deep equal.
 *
 * Based on https://github.com/sanity-io/preview-kit/blob/v6.2.0/packages/preview-kit/src/hooks.ts#L115-L126
 * @internal
 */
export function getStableQueryPerspective(
  perspective: LivePreviewPerspective | null,
): LivePreviewPerspective | null {
  return JSON.parse(
    JSON.stringify(perspective),
  ) as LivePreviewPerspective | null;
}

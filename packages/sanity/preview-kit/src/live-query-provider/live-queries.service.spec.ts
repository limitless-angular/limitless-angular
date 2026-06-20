import { getQueryCacheKey } from './utils';
import { LiveQueriesService } from './live-queries.service';
import type { ContentSourceMap } from '@sanity/client';

describe('LiveQueriesService', () => {
  it('tracks query subscriptions by query, params, and perspective', () => {
    const service = new LiveQueriesService();
    const params = { slug: 'hello' };
    const key = getQueryCacheKey('*[_type == "post"]', params, 'drafts');

    const unsubscribe = service.subscribe(
      '*[_type == "post"]',
      params,
      'drafts',
    );

    expect(service.queries.get(key)).toEqual({
      query: '*[_type == "post"]',
      params,
      perspective: 'drafts',
      listeners: 1,
    });

    unsubscribe();

    expect(service.queries.has(key)).toBe(false);
  });

  it('updates snapshots with deep-equality reference preservation', () => {
    const service = new LiveQueriesService();
    const query = '*[_id == $id][0]';
    const params = { id: 'post' };
    const key = getQueryCacheKey(query, params, 'drafts');
    const values: unknown[] = [];
    const subscription = service
      .observe({ title: 'Initial' }, query, params, 'drafts')
      .subscribe((value) => values.push(value));

    expect(values).toEqual([{ title: 'Initial' }]);

    expect(service.update(key, { title: 'Live' }, undefined, ['s1:post'])).toBe(
      true,
    );
    expect(values).toEqual([{ title: 'Initial' }, { title: 'Live' }]);

    expect(service.update(key, { title: 'Live' }, undefined, ['s1:post'])).toBe(
      false,
    );
    expect(values).toEqual([{ title: 'Initial' }, { title: 'Live' }]);

    expect(
      service.update(key, { title: 'Live' }, undefined, ['s1:settings']),
    ).toBe(true);
    expect(values).toEqual([{ title: 'Initial' }, { title: 'Live' }]);

    subscription.unsubscribe();
  });

  it('uses deep equality for source maps when deciding whether to update', () => {
    const service = new LiveQueriesService();
    const query = '*[_id == $id][0]';
    const params = { id: 'post' };
    const key = getQueryCacheKey(query, params, 'drafts');
    const result = { title: 'Live' };
    const sourceMap = {
      documents: [{ _id: 'post', _type: 'post' }],
      mappings: {
        title: {
          source: {
            document: 0,
            path: 0,
            type: 'documentValue',
          },
          type: 'value',
        },
      },
      paths: ['title'],
    } satisfies ContentSourceMap;

    expect(service.update(key, result, sourceMap, ['s1:post'])).toBe(true);
    expect(
      service.update(
        key,
        { title: 'Live' },
        {
          ...sourceMap,
          documents: [{ _id: 'post', _type: 'post' }],
          paths: ['title'],
        },
        ['s1:post'],
      ),
    ).toBe(false);
  });
});

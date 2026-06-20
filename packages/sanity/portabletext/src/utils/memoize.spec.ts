import { describe, expect, it, vi } from 'vitest';

import { memoize } from './memoize';

describe('memoize', () => {
  it('returns the cached result for the same argument reference', () => {
    const fn = vi.fn((value: { text: string }) => [value.text]);
    const memoized = memoize(fn);
    const value = { text: 'cached' };

    const first = memoized(value);
    const second = memoized(value);

    expect(second).toBe(first);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('treats equal object values with different references as separate keys', () => {
    const fn = vi.fn((value: { text: string }) => [value.text]);
    const memoized = memoize(fn);

    const first = memoized({ text: 'same value' });
    const second = memoized({ text: 'same value' });

    expect(second).not.toBe(first);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

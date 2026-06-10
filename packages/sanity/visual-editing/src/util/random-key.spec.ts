import { describe, expect, test } from 'vitest';

import { randomKey } from './random-key';

describe('randomKey', () => {
  test('matches upstream default key length', () => {
    expect(randomKey()).toMatch(/^[0-9a-f]{32}$/);
  });

  test('respects explicit key lengths', () => {
    expect(randomKey(16)).toMatch(/^[0-9a-f]{16}$/);
    expect(randomKey(0)).toBe('');
  });
});

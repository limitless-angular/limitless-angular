import type { SanityDocument } from '@sanity/client';
import type { MutatorActor } from '@sanity/visual-editing/optimistic';
import { describe, expect, test, vi } from 'vitest';

import { createDocumentsGet } from './documents';

type TestPost = SanityDocument<Record<string, unknown>> & {
  title: string;
};

function createMutatorActor(snapshot: TestPost) {
  const draftDoc = {
    getSnapshot: vi.fn(() => ({ context: { local: snapshot } })),
    on: vi.fn(),
    send: vi.fn(),
  };
  const publishedDoc = {
    getSnapshot: vi.fn(() => ({ context: { local: null } })),
    on: vi.fn(),
    send: vi.fn(),
  };
  const actor = {
    getSnapshot: vi.fn(() => ({
      context: {
        documents: {
          'drafts.post-id': draftDoc,
          'post-id': publishedDoc,
        },
      },
    })),
  } as unknown as MutatorActor;

  return { actor, draftDoc, publishedDoc };
}

describe('createDocumentsGet', () => {
  test('exposes the current document through getSnapshot', async () => {
    const snapshot = {
      _createdAt: '2026-01-01T00:00:00.000Z',
      _id: 'drafts.post-id',
      _rev: 'rev',
      _type: 'post',
      _updatedAt: '2026-01-01T00:00:00.000Z',
      title: 'Hello',
    };
    const { actor } = createMutatorActor(snapshot);

    const document = createDocumentsGet(actor)<TestPost>('post-id');

    await expect(document.getSnapshot()).resolves.toEqual(snapshot);
  });

  test('resolves patch callbacks and draft creation from getSnapshot', async () => {
    const snapshot = {
      _createdAt: '2026-01-01T00:00:00.000Z',
      _id: 'post-id',
      _rev: 'rev',
      _type: 'post',
      _updatedAt: '2026-01-01T00:00:00.000Z',
      title: 'Hello',
    };
    const { actor, draftDoc } = createMutatorActor(snapshot);
    const document = createDocumentsGet(actor)<TestPost>('post-id');

    await document.patch(async ({ getSnapshot }) => {
      await expect(getSnapshot()).resolves.toEqual(snapshot);
      return [];
    });

    expect(draftDoc.send).toHaveBeenCalledWith({
      type: 'mutate',
      mutations: expect.arrayContaining([
        expect.objectContaining({
          document: expect.objectContaining({ _id: 'drafts.post-id' }),
        }),
      ]),
    });
    expect(draftDoc.send).toHaveBeenCalledWith({ type: 'submit' });
  });
});

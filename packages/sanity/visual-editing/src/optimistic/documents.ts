/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SanityDocument } from '@sanity/client';
import { getDraftId, getPublishedId } from '@sanity/client/csm';
import { createIfNotExists, patch } from '@sanity/mutate';

import type { MutatorActor } from './context';
import type {
  DocumentsGet,
  DocumentsMutate,
  OptimisticDocumentPatches,
  Path,
  PathValue,
} from './types';
import { getAtPath } from '../util/get-at-path';

function debounce<F extends (...args: Parameters<F>) => ReturnType<F>>(
  fn: F,
  timeout: number,
): F {
  let timer: ReturnType<typeof setTimeout>;

  return ((...args: Parameters<F>) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(fn, args);
    }, timeout);
  }) as F;
}

function getDocumentsAndSnapshot<T extends Record<string, any>>(
  id: string,
  actor: MutatorActor,
) {
  const draftId = getDraftId(id);
  const publishedId = getPublishedId(id);
  const documents = actor.getSnapshot().context?.documents;

  const draftDoc = documents?.[draftId];
  const publishedDoc = documents?.[publishedId];
  const doc = draftDoc || publishedDoc;

  if (!doc) {
    throw new Error(`Document "${id}" not found`);
  }

  if (!draftDoc) {
    throw new Error(`Draft document actor "${draftId}" not found`);
  }

  const getDocumentSnapshot = () =>
    (draftDoc?.getSnapshot().context?.local ||
      publishedDoc?.getSnapshot().context?.local) as
      | SanityDocument<T>
      | null
      | undefined;

  const snapshot = getDocumentSnapshot();
  const snapshotPromise = new Promise<SanityDocument<T> | null>((resolve) => {
    if (snapshot) {
      resolve(snapshot);
      return;
    }

    const subscriber = doc.on('ready', (event) => {
      const { snapshot } = event as unknown as {
        snapshot: SanityDocument<T> | null | undefined;
      };
      resolve(snapshot || null);
      subscriber.unsubscribe();
    });
  });

  const getSnapshot = () => snapshotPromise;

  return {
    draftDoc,
    draftId,
    getSnapshot,
    publishedDoc,
    publishedId,
    /**
     * @deprecated - use `getSnapshot` instead
     */
    get snapshot() {
      if (!snapshot) {
        throw new Error(`Snapshot for document "${id}" not found`);
      }

      return snapshot;
    },
  };
}

function createDocumentCommit<T extends Record<string, any>>(
  id: string,
  actor: MutatorActor,
) {
  return (): void => {
    const { draftDoc } = getDocumentsAndSnapshot<T>(id, actor);
    draftDoc.send({ type: 'submit' });
  };
}

function createDocumentGet<T extends Record<string, any>>(
  id: string,
  actor: MutatorActor,
) {
  return <P extends Path<T, keyof T>>(
    path?: P,
  ): PathValue<T, P> | SanityDocument<T> | undefined => {
    const { snapshot } = getDocumentsAndSnapshot<T>(id, actor);

    return path
      ? (getAtPath(snapshot, path) as PathValue<T, P>)
      : (snapshot as unknown as SanityDocument<T>);
  };
}

function createDocumentGetSnapshot<T extends Record<string, any>>(
  id: string,
  actor: MutatorActor,
): () => Promise<SanityDocument<T> | null> {
  const { getSnapshot } = getDocumentsAndSnapshot<T>(id, actor);
  return getSnapshot;
}

function createDocumentPatch<T extends Record<string, any>>(
  id: string,
  actor: MutatorActor,
) {
  return async (
    patches: OptimisticDocumentPatches<T>,
    options?: { commit?: boolean | { debounce: number } },
  ): Promise<void> => {
    const result = getDocumentsAndSnapshot<T>(id, actor);
    const { draftDoc, draftId, getSnapshot, publishedId } = result;
    const { commit = true } = options || {};

    const context = {
      draftId,
      publishedId,
      /**
       * @deprecated - use `getSnapshot` instead
       */
      get snapshot() {
        return result.snapshot;
      },
      getSnapshot,
    };

    const resolvedPatches = await (typeof patches === 'function'
      ? patches(context)
      : patches);

    const snapshot = await getSnapshot();

    if (!snapshot) {
      throw new Error(`Snapshot for document "${id}" not found`);
    }

    draftDoc.send({
      type: 'mutate',
      mutations: [
        createIfNotExists({ ...snapshot, _id: draftId }),
        patch(draftId, resolvedPatches),
      ],
    });

    if (commit) {
      if (typeof commit === 'object' && 'debounce' in commit) {
        const debouncedCommit = debounce(
          () => draftDoc.send({ type: 'submit' }),
          commit.debounce,
        );
        debouncedCommit();
      } else {
        draftDoc.send({ type: 'submit' });
      }
    }
  };
}

export function createDocumentsGet(actor: MutatorActor): DocumentsGet {
  return <T extends Record<string, any>>(documentId: string) => ({
    id: documentId,
    commit: createDocumentCommit(documentId, actor),
    get: createDocumentGet(documentId, actor),
    getSnapshot: createDocumentGetSnapshot<T>(documentId, actor),
    patch: createDocumentPatch<T>(documentId, actor),
  });
}

export function createDocumentsMutate(actor: MutatorActor): DocumentsMutate {
  return (id, mutations, options) => {
    const { draftDoc } = getDocumentsAndSnapshot(id, actor);
    const { commit = true } = options || {};

    draftDoc.send({
      type: 'mutate',
      mutations,
    });

    if (commit) {
      if (typeof commit === 'object' && 'debounce' in commit) {
        const debouncedCommit = debounce(
          () => draftDoc.send({ type: 'submit' }),
          commit.debounce,
        );
        debouncedCommit();
      } else {
        draftDoc.send({ type: 'submit' });
      }
    }
  };
}

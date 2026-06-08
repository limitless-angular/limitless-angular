import type { SanityDocument } from '@sanity/client';
import { at, insert, truncate, type NodePatchList } from '@sanity/mutate';
import type { OptimisticDocument } from '@sanity/visual-editing/optimistic';

import type { SanityNode } from './types';
import { getAtPath } from './util/get-at-path';

function randomKey(length?: number): string {
  const byteLength = length ?? 16;
  const bytes = new Uint8Array(byteLength);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < byteLength; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length);
}

export function getArrayItemKeyAndParentPath(pathOrNode: string | SanityNode): {
  path: string;
  key: string;
  hasExplicitKey: boolean;
} {
  const elementPath =
    typeof pathOrNode === 'string' ? pathOrNode : pathOrNode.path;
  const lastDotIndex = elementPath.lastIndexOf('.');
  const lastPathItem = elementPath.substring(lastDotIndex + 1);

  if (!lastPathItem.includes('[')) {
    throw new Error('Invalid path: not an array');
  }

  const lastArrayIndex = elementPath.lastIndexOf('[');
  const path = elementPath.substring(0, lastArrayIndex);
  let key: string;
  let hasExplicitKey: boolean;

  if (lastPathItem.includes('_key')) {
    const startIndex = lastPathItem.indexOf('"') + 1;
    const endIndex = lastPathItem.indexOf('"', startIndex);

    key = lastPathItem.substring(startIndex, endIndex);
    hasExplicitKey = true;
  } else {
    const startIndex = lastPathItem.indexOf('[') + 1;
    const endIndex = lastPathItem.indexOf(']', startIndex);

    key = lastPathItem.substring(startIndex, endIndex);
    hasExplicitKey = false;
  }

  if (!path || !key) {
    throw new Error('Invalid path');
  }

  return {
    path,
    key,
    hasExplicitKey,
  };
}

export function getArrayDuplicatePatches(
  node: SanityNode,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  snapshot: SanityDocument<Record<string, any>>,
  position: 'before' | 'after' = 'after',
): NodePatchList {
  const { path: arrayPath, key: itemKey } = getArrayItemKeyAndParentPath(node);
  const item = getAtPath(snapshot, node.path) as object;
  const duplicate = { ...item, _key: randomKey() };

  return [at(arrayPath, insert(duplicate, position, { _key: itemKey }))];
}

export function getArrayRemovePatches(
  node: SanityNode,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  snapshot: SanityDocument<Record<string, any>>,
): NodePatchList {
  const { path: arrayPath, key: itemKey } = getArrayItemKeyAndParentPath(node);
  const array = getAtPath(snapshot, arrayPath) as { _key: string }[];
  const currentIndex = array.findIndex((item) => item._key === itemKey);

  return [at(arrayPath, truncate(currentIndex, currentIndex + 1))];
}

export function getArrayInsertPatches(
  node: SanityNode,
  insertType: string,
  position: 'before' | 'after',
): NodePatchList {
  const { path: arrayPath, key: itemKey } = getArrayItemKeyAndParentPath(node);
  const insertKey = randomKey();

  return [
    at(
      arrayPath,
      insert([{ _type: insertType, _key: insertKey }], position, {
        _key: itemKey,
      }),
    ),
  ];
}

export async function getArrayMovePatches(
  node: SanityNode,
  doc: OptimisticDocument,
  moveTo: 'previous' | 'next' | 'first' | 'last',
): Promise<NodePatchList> {
  if (!node.type) {
    throw new Error('Node type is missing');
  }

  const { path: arrayPath, key: itemKey } = getArrayItemKeyAndParentPath(node);
  const snapshot = await doc.getSnapshot();
  const array = getAtPath(snapshot, arrayPath) as { _key: string }[];
  const item = getAtPath(snapshot, node.path);
  const currentIndex = array.findIndex(
    (arrayItem) => arrayItem._key === itemKey,
  );

  let nextIndex = -1;
  let position: 'before' | 'after' = 'before';

  if (moveTo === 'first') {
    if (currentIndex === 0) {
      return [];
    }
    nextIndex = 0;
  } else if (moveTo === 'last') {
    if (currentIndex === array.length - 1) {
      return [];
    }
    position = 'after';
  } else if (moveTo === 'next') {
    if (currentIndex === array.length - 1) {
      return [];
    }
    nextIndex = currentIndex;
    position = 'after';
  } else if (moveTo === 'previous') {
    if (currentIndex === 0) {
      return [];
    }
    nextIndex = currentIndex - 1;
  }

  return [
    at(arrayPath, truncate(currentIndex, currentIndex + 1)),
    at(arrayPath, insert(item, position, nextIndex)),
  ];
}

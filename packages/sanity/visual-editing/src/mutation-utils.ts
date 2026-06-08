import type { SanityNode } from './types';

export function getArrayItemKeyAndParentPath(pathOrNode: string | SanityNode): {
  path: string;
  key: string;
  hasExplicitKey: boolean;
} {
  const elementPath =
    typeof pathOrNode === 'string' ? pathOrNode : pathOrNode.path;
  const lastDotIndex = elementPath.lastIndexOf('.');
  const lastPathItem = elementPath.substring(lastDotIndex + 1);

  if (!lastPathItem.startsWith('[')) {
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

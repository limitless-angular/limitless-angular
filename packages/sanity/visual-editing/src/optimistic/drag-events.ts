import { at, insert, remove } from '@sanity/mutate';
import type { DocumentsGet } from '@sanity/visual-editing/optimistic';

import { getArrayItemKeyAndParentPath } from '../mutation-utils';
import type { DragEndEvent, DragInsertPosition } from '../types';
import { getAtPath } from '../util/get-at-path';

function getReferenceNodeAndInsertPosition(position: DragInsertPosition) {
  if (position) {
    const { top, right, bottom, left } = position;

    if (left || top) {
      const match = left ?? top;
      return match
        ? { node: match.sanity, position: 'after' as const }
        : undefined;
    }

    if (right || bottom) {
      const match = right ?? bottom;
      return match
        ? { node: match.sanity, position: 'before' as const }
        : undefined;
    }
  }

  return undefined;
}

export function handleDragEndEvent(
  event: DragEndEvent,
  getDocument: DocumentsGet,
): void {
  const { insertPosition, target, preventInsertDefault } = event;

  if (preventInsertDefault) {
    return;
  }

  const reference = getReferenceNodeAndInsertPosition(insertPosition);
  if (!reference) {
    return;
  }

  const doc = getDocument(target.id);
  const { node, position } = reference;
  const { key: targetKey, hasExplicitKey } =
    getArrayItemKeyAndParentPath(target);
  const { path: arrayPath, key: referenceItemKey } =
    getArrayItemKeyAndParentPath(node);

  if (!arrayPath || !referenceItemKey || referenceItemKey === targetKey) {
    return;
  }

  doc.patch(async ({ getSnapshot }) => {
    const snapshot = await getSnapshot();
    const elementValue = getAtPath(snapshot, target.path);

    if (hasExplicitKey) {
      return [
        at(arrayPath, remove({ _key: targetKey })),
        at(
          arrayPath,
          insert(elementValue, position, { _key: referenceItemKey }),
        ),
      ];
    }

    return [
      at(arrayPath, remove(Number(targetKey))),
      at(
        arrayPath,
        insert(
          elementValue,
          position,
          referenceItemKey > targetKey
            ? Number(referenceItemKey) - 1
            : Number(referenceItemKey),
        ),
      ),
    ];
  });
}

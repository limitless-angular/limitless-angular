import { PortableTextBlock } from '@portabletext/types';
import { Serializable, SerializedBlock } from './types';
import { buildMarksTree } from '@portabletext/toolkit';

export function serializeBlock(
  options: Serializable<PortableTextBlock>,
): SerializedBlock {
  const { node, index, isInline } = options;
  const tree = buildMarksTree(node);
  const children = tree.map((child, i) => ({
    ...child,
    isInline: true,
    index: i,
  }));

  return {
    _key: trackBy(node._key, index, 'block'),
    children,
    isInline,
    node,
  };
}

export function trackBy(
  key: string | undefined,
  index: number,
  prefix = 'node',
) {
  return key ?? `${prefix}-${index}`;
}

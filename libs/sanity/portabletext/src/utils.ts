import { PortableTextBlock } from '@portabletext/types';
import { Serializable, SerializedBlock } from './types';
import { buildMarksTree } from '@portabletext/toolkit';

export function serializeBlock(
  options: Serializable<PortableTextBlock>,
): SerializedBlock {
  const { node, isInline } = options;

  const tree = buildMarksTree(node);
  const children = tree.map((child, i) => ({
    ...child,
    // TODO: check this _key generation
    _key: (child as any)._key ?? `block-${i}`,
  }));

  return {
    _key: node._key,
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

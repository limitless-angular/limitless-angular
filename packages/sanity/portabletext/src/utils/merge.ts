import type { PortableTextComponents } from '../types';

export function mergeComponents(
  parent: PortableTextComponents,
  overrides: Partial<PortableTextComponents>,
): Required<PortableTextComponents> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { block, list, listItem, marks, types, ...rest } = overrides;
  return {
    ...parent,
    block: mergeDeeply(parent, overrides, 'block'),
    list: mergeDeeply(parent, overrides, 'list'),
    listItem: mergeDeeply(parent, overrides, 'listItem'),
    marks: mergeDeeply(parent, overrides, 'marks'),
    types: mergeDeeply(parent, overrides, 'types'),
    ...rest,
  } as Required<PortableTextComponents>;
}

function mergeDeeply<
  T extends 'block' | 'list' | 'listItem' | 'marks' | 'types',
>(
  parent: PortableTextComponents,
  overrides: Partial<PortableTextComponents>,
  key: T,
): PortableTextComponents[T] {
  const override = overrides[key];
  const parentVal = parent[key];

  if (typeof override === 'function') {
    return override as PortableTextComponents[T];
  }

  if (override && typeof parentVal === 'function') {
    return override;
  }

  if (override) {
    return { ...parentVal, ...override };
  }

  return parentVal;
}

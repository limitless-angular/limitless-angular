import type {
  PortableTextAngularComponents,
  PortableTextComponents,
} from '../types';

export function mergeComponents(
  parent: PortableTextAngularComponents,
  overrides: PortableTextComponents,
): PortableTextAngularComponents {
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
  } as PortableTextAngularComponents;
}

function mergeDeeply<
  T extends 'block' | 'list' | 'listItem' | 'marks' | 'types',
>(
  parent: PortableTextAngularComponents,
  overrides: PortableTextComponents,
  key: T,
): PortableTextAngularComponents[T] {
  const override = overrides[key];
  const parentVal = parent[key];

  if (typeof override === 'function') {
    return override as PortableTextAngularComponents[T];
  }

  if (override && typeof parentVal === 'function') {
    return override;
  }

  if (override) {
    return { ...parentVal, ...override } as PortableTextAngularComponents[T];
  }

  return parentVal;
}

import type {
  DocumentSchema,
  ResolvedSchemaTypeMap,
  SanityNode,
  SanityStegaNode,
  SchemaArrayItem,
  SchemaType,
  TypeSchema,
  UnresolvedPath,
} from '@sanity/presentation-comlink';

import type {
  ElementState,
  OverlayElementField,
  OverlayElementParent,
} from './types';

export interface SchemaContextValue {
  getField: (node: SanityNode | SanityStegaNode) => {
    field: OverlayElementField;
    parent: OverlayElementParent;
  };
  getType: <T extends 'document' | 'type' = 'document'>(
    node: SanityNode | SanityStegaNode | string,
    type?: T,
  ) => T extends 'document'
    ? DocumentSchema | undefined
    : TypeSchema | undefined;
  resolvedTypes: ResolvedSchemaTypeMap;
  schema: SchemaType[];
}

function isSanityNode(node: SanityNode | SanityStegaNode): node is SanityNode {
  return 'path' in node;
}

function isDocumentSchemaType(type: SchemaType): type is DocumentSchema {
  return type.type === 'document';
}

function isTypeSchemaType(type: SchemaType): type is TypeSchema {
  return type.type === 'type';
}

function popUnkeyedPathSegments(path: string): string {
  return path
    .split('.')
    .slice()
    .reverse()
    .reduce((acc, part) => {
      if (acc.length) {
        return [part, ...acc];
      }

      if (part.includes('[_key==')) {
        return [part];
      }

      return [];
    }, [] as string[])
    .join('.');
}

export function getPathsWithUnresolvedTypes(
  elements: ElementState[],
): UnresolvedPath[] {
  return elements.reduce((acc, element) => {
    const { sanity } = element;

    if (!('id' in sanity) || !sanity.path.includes('[_key==')) {
      return acc;
    }

    const path = popUnkeyedPathSegments(sanity.path);
    if (!acc.find((item) => item.id === sanity.id && item.path === path)) {
      acc.push({ id: sanity.id, path });
    }

    return acc;
  }, [] as UnresolvedPath[]);
}

export function haveSameUnresolvedPaths(
  previous: UnresolvedPath[],
  next: UnresolvedPath[],
): boolean {
  if (previous.length !== next.length) {
    return false;
  }

  return next.every((item) =>
    previous.find(({ id, path }) => id === item.id && path === item.path),
  );
}

export function createSchemaContext(
  schema: SchemaType[],
  resolvedTypes: ResolvedSchemaTypeMap,
): SchemaContextValue {
  function getType<T extends 'document' | 'type' = 'document'>(
    node: SanityNode | SanityStegaNode | string,
    _type?: T,
  ): T extends 'document'
    ? DocumentSchema | undefined
    : TypeSchema | undefined {
    const type = _type || 'document';

    if (
      !schema.length ||
      (typeof node !== 'string' &&
        (!isSanityNode(node) || !Array.isArray(schema)))
    ) {
      return undefined as T extends 'document'
        ? DocumentSchema | undefined
        : TypeSchema | undefined;
    }

    const name = typeof node === 'string' ? node : node.type;
    const filter =
      type === 'document' ? isDocumentSchemaType : isTypeSchemaType;

    return schema
      .filter(filter)
      .find((schemaType) => schemaType.name === name) as T extends 'document'
      ? DocumentSchema | undefined
      : TypeSchema | undefined;
  }

  function getField(node: SanityNode | SanityStegaNode): {
    field: OverlayElementField;
    parent: OverlayElementParent;
  } {
    if (!isSanityNode(node)) {
      return {
        field: undefined,
        parent: undefined,
      };
    }

    const sanityNode = node;
    const schemaType = getType(node);

    if (!schemaType) {
      return {
        field: undefined,
        parent: undefined,
      };
    }

    function fieldFromPath(
      currentSchemaType: OverlayElementParent,
      path: string[],
      parent: OverlayElementParent,
      prevPath: string[] = [],
    ): {
      field: OverlayElementField;
      parent: OverlayElementParent;
    } {
      if (!currentSchemaType) {
        return { field: undefined, parent: undefined };
      }

      const [next, ...rest] = path;

      if (!next) {
        return { field: undefined, parent };
      }

      if ('fields' in currentSchemaType) {
        const objectField = currentSchemaType.fields[next];

        if (!objectField && 'rest' in currentSchemaType) {
          return fieldFromPath(
            currentSchemaType.rest,
            path,
            currentSchemaType,
            prevPath,
          );
        }

        if (!rest.length) {
          return { field: objectField, parent };
        }

        if (!objectField) {
          throw new Error(
            `[@sanity/visual-editing] No field could be resolved at path: "${[
              ...prevPath,
              ...path,
            ].join('.')}"`,
          );
        }

        return fieldFromPath(objectField.value, rest, currentSchemaType, [
          ...prevPath,
          next,
        ]);
      }

      if (currentSchemaType.type === 'array') {
        return fieldFromPath(
          currentSchemaType.of,
          path,
          currentSchemaType,
          prevPath,
        );
      }

      if (currentSchemaType.type === 'arrayItem') {
        if (!rest.length) {
          return { field: currentSchemaType as SchemaArrayItem, parent };
        }

        return fieldFromPath(currentSchemaType.value, rest, currentSchemaType, [
          ...prevPath,
          next,
        ]);
      }

      if (currentSchemaType.type === 'union') {
        const name = next.startsWith('[_key==')
          ? (resolvedTypes
              .get(sanityNode.id)
              ?.get([prevPath.join('.'), next].filter(Boolean).join('')) as
              | string
              | undefined)
          : next;
        const option = currentSchemaType.of.find((item) =>
          item.type === 'unionOption' ? item.name === name : true,
        );

        return fieldFromPath(option, rest, currentSchemaType, [
          ...prevPath,
          next,
        ]);
      }

      if (currentSchemaType.type === 'unionOption') {
        if (!next) {
          return { field: currentSchemaType, parent };
        }

        return fieldFromPath(
          currentSchemaType.value,
          path,
          currentSchemaType,
          prevPath,
        );
      }

      if (currentSchemaType.type === 'inline') {
        const type = getType(currentSchemaType.name, 'type');
        return fieldFromPath(
          (type as TypeSchema | undefined)?.value,
          path,
          currentSchemaType,
          prevPath,
        );
      }

      throw new Error(
        `[@sanity/visual-editing] No field could be resolved at path: "${[
          ...prevPath,
          ...path,
        ].join('.')}"`,
      );
    }

    const nodePath = node.path.split('.').flatMap((part) => {
      if (part.includes('[')) {
        return part.split(/(\[.+\])/, 2);
      }

      return [part];
    });

    try {
      return fieldFromPath(schemaType, nodePath, undefined);
    } catch (error) {
      if (error instanceof Error) {
        console.warn(error.message);
      }

      return { field: undefined, parent: undefined };
    }
  }

  return {
    getField,
    getType,
    resolvedTypes,
    schema,
  };
}

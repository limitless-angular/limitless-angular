import type {
  SanityNode,
  SchemaArrayItem,
  SchemaNode,
  SchemaUnionNode,
  SchemaUnionOption,
} from '@sanity/presentation-comlink';

import {
  getArrayDuplicatePatches,
  getArrayInsertPatches,
  getArrayMovePatches,
  getArrayRemovePatches,
} from '../../util/mutations';
import type { OptimisticDocument } from '@sanity/visual-editing/optimistic';
import type { OverlayElementField, OverlayElementParent } from '../../types';
import { getNodeIcon, type NodeIconDescriptor } from '../../util/get-node-icon';

export type ContextMenuTelemetryEventName =
  | 'Visual Editing Context Menu Item Duplicated'
  | 'Visual Editing Context Menu Item Inserted'
  | 'Visual Editing Context Menu Item Moved'
  | 'Visual Editing Context Menu Item Removed';

export type ContextMenuActionNode = {
  action?: () => void;
  icon?: NodeIconDescriptor;
  label: string;
  telemetryEvent: ContextMenuTelemetryEventName;
  type: 'action';
};

export type ContextMenuDividerNode = {
  type: 'divider';
};

export type ContextMenuGroupNode = {
  icon?: NodeIconDescriptor;
  items: ContextMenuNode[];
  label: string;
  type: 'group';
};

export type ContextMenuInsertMenuNode = {
  action: (schemaType: SchemaUnionOption<SchemaNode>) => void;
  icon?: NodeIconDescriptor;
  label: string;
  parent: SchemaUnionNode<SchemaNode>;
  telemetryEvent: ContextMenuTelemetryEventName;
  type: 'insert-menu';
};

export type ContextMenuNode =
  | ContextMenuActionNode
  | ContextMenuDividerNode
  | ContextMenuGroupNode
  | ContextMenuInsertMenuNode;

type SchemaUnionMember = SchemaUnionNode<SchemaNode>['of'][number];
type SchemaUnionOptionMember = Extract<
  SchemaUnionMember,
  { type: 'unionOption' }
>;

function getArrayRemoveAction(
  node: SanityNode,
  doc: OptimisticDocument,
): () => void {
  if (!node.type) {
    throw new Error('Node type is missing');
  }

  return () =>
    doc.patch(async ({ getSnapshot }) => {
      const snapshot = await getSnapshot();
      if (!snapshot) {
        throw new Error(`Snapshot for document "${node.id}" not found`);
      }

      return getArrayRemovePatches(node, snapshot);
    });
}

function getArrayInsertAction(
  node: SanityNode,
  doc: OptimisticDocument,
  insertType: string,
  position: 'before' | 'after',
): () => void {
  if (!node.type) {
    throw new Error('Node type is missing');
  }

  return () =>
    doc.patch(() => getArrayInsertPatches(node, insertType, position));
}

function getDuplicateAction(
  node: SanityNode,
  doc: OptimisticDocument,
): () => void {
  if (!node.type) {
    throw new Error('Node type is missing');
  }

  return () =>
    doc.patch(async ({ getSnapshot }) => {
      const snapshot = await getSnapshot();
      if (!snapshot) {
        throw new Error(`Snapshot for document "${node.id}" not found`);
      }

      return getArrayDuplicatePatches(node, snapshot);
    });
}

function getDuplicateItem(context: {
  doc: OptimisticDocument;
  node: SanityNode;
}): ContextMenuNode[] {
  const { doc, node } = context;

  return [
    {
      action: getDuplicateAction(node, doc),
      icon: { label: 'Duplicate', text: 'Copy' },
      label: 'Duplicate',
      telemetryEvent: 'Visual Editing Context Menu Item Duplicated',
      type: 'action',
    },
  ];
}

function getRemoveItems(context: {
  doc: OptimisticDocument;
  node: SanityNode;
}): ContextMenuNode[] {
  const { doc, node } = context;

  return [
    {
      action: getArrayRemoveAction(node, doc),
      icon: { label: 'Remove', text: 'Del' },
      label: 'Remove',
      telemetryEvent: 'Visual Editing Context Menu Item Removed',
      type: 'action',
    },
  ];
}

async function getMoveItems(
  context: {
    doc: OptimisticDocument;
    node: SanityNode;
  },
  withDivider = true,
): Promise<ContextMenuNode[]> {
  const { doc, node } = context;
  const items: ContextMenuNode[] = [];
  const groupItems: ContextMenuNode[] = [];

  const [moveUpPatches, moveDownPatches, moveFirstPatches, moveLastPatches] =
    await Promise.all([
      getArrayMovePatches(node, doc, 'previous'),
      getArrayMovePatches(node, doc, 'next'),
      getArrayMovePatches(node, doc, 'first'),
      getArrayMovePatches(node, doc, 'last'),
    ]);

  if (moveFirstPatches.length) {
    groupItems.push({
      action: () => doc.patch(moveFirstPatches),
      icon: { label: 'To top', text: 'Top' },
      label: 'To top',
      telemetryEvent: 'Visual Editing Context Menu Item Moved',
      type: 'action',
    });
  }

  if (moveUpPatches.length) {
    groupItems.push({
      action: () => doc.patch(moveUpPatches),
      icon: { label: 'Up', text: 'Up' },
      label: 'Up',
      telemetryEvent: 'Visual Editing Context Menu Item Moved',
      type: 'action',
    });
  }

  if (moveDownPatches.length) {
    groupItems.push({
      action: () => doc.patch(moveDownPatches),
      icon: { label: 'Down', text: 'Down' },
      label: 'Down',
      telemetryEvent: 'Visual Editing Context Menu Item Moved',
      type: 'action',
    });
  }

  if (moveLastPatches.length) {
    groupItems.push({
      action: () => doc.patch(moveLastPatches),
      icon: { label: 'To bottom', text: 'End' },
      label: 'To bottom',
      telemetryEvent: 'Visual Editing Context Menu Item Moved',
      type: 'action',
    });
  }

  if (groupItems.length) {
    items.push({
      icon: { label: 'Move', text: 'Move' },
      items: groupItems,
      label: 'Move',
      type: 'group',
    });

    if (withDivider) {
      items.push({ type: 'divider' });
    }
  }

  return items;
}

async function getContextMenuArrayItems(context: {
  doc: OptimisticDocument;
  field: SchemaArrayItem;
  node: SanityNode;
}): Promise<ContextMenuNode[]> {
  const { field, node, doc } = context;

  return [
    ...getDuplicateItem(context),
    ...getRemoveItems(context),
    ...(await getMoveItems(context)),
    {
      action: getArrayInsertAction(node, doc, field.name, 'before'),
      icon: { label: 'Insert before', text: '+Up' },
      label: 'Insert before',
      telemetryEvent: 'Visual Editing Context Menu Item Inserted',
      type: 'action',
    },
    {
      action: getArrayInsertAction(node, doc, field.name, 'after'),
      icon: { label: 'Insert after', text: '+Dn' },
      label: 'Insert after',
      telemetryEvent: 'Visual Editing Context Menu Item Inserted',
      type: 'action',
    },
  ];
}

function isSchemaUnionOption(
  node: SchemaUnionMember,
): node is SchemaUnionOptionMember {
  return node.type === 'unionOption';
}

function getSchemaTypeLabel(node: SchemaUnionOptionMember): string {
  return node.name === 'block' ? 'Paragraph' : node.title || node.name;
}

function getUnionInsertMenuItem(
  context: {
    doc: OptimisticDocument;
    node: SanityNode;
    parent: SchemaUnionNode<SchemaNode>;
  },
  position: 'before' | 'after',
): ContextMenuInsertMenuNode {
  const { doc, node, parent } = context;

  return {
    action: (schemaType) =>
      getArrayInsertAction(node, doc, schemaType.name, position)(),
    icon:
      position === 'before'
        ? { label: 'Insert before', text: '+Up' }
        : { label: 'Insert after', text: '+Dn' },
    label: position === 'before' ? 'Insert before' : 'Insert after',
    parent,
    telemetryEvent: 'Visual Editing Context Menu Item Inserted',
    type: 'insert-menu',
  };
}

function getUnionInsertItems(
  context: {
    doc: OptimisticDocument;
    node: SanityNode;
    parent: SchemaUnionNode<SchemaNode>;
  },
  position: 'before' | 'after',
): ContextMenuNode {
  const { doc, node, parent } = context;

  return {
    icon:
      position === 'before'
        ? { label: 'Insert before', text: '+Up' }
        : { label: 'Insert after', text: '+Dn' },
    items: parent.of.filter(isSchemaUnionOption).map((schemaType) => ({
      action: getArrayInsertAction(node, doc, schemaType.name, position),
      icon: getNodeIcon(schemaType),
      label: getSchemaTypeLabel(schemaType),
      telemetryEvent: 'Visual Editing Context Menu Item Inserted',
      type: 'action',
    })),
    label: position === 'before' ? 'Insert before' : 'Insert after',
    type: 'group',
  };
}

async function getContextMenuUnionItems(context: {
  doc: OptimisticDocument;
  node: SanityNode;
  parent: SchemaUnionNode<SchemaNode>;
}): Promise<ContextMenuNode[]> {
  const baseItems = [
    ...getDuplicateItem(context),
    ...getRemoveItems(context),
    ...(await getMoveItems(context)),
  ];

  if (context.parent.options?.insertMenu) {
    return [
      ...baseItems,
      getUnionInsertMenuItem(context, 'before'),
      getUnionInsertMenuItem(context, 'after'),
    ];
  }

  return [
    ...baseItems,
    getUnionInsertItems(context, 'before'),
    getUnionInsertItems(context, 'after'),
  ];
}

export function getContextMenuTitle(field: OverlayElementField): string {
  return field?.title || field?.name || 'Unknown type';
}

export function getContextMenuIcon(
  field: OverlayElementField,
): NodeIconDescriptor {
  return getNodeIcon(field);
}

export function getContextMenuItems(context: {
  doc: OptimisticDocument;
  field: OverlayElementField;
  node: SanityNode;
  parent: OverlayElementParent;
}): Promise<ContextMenuNode[]> {
  const { field, parent } = context;

  if (field?.type === 'arrayItem') {
    return getContextMenuArrayItems({
      doc: context.doc,
      field,
      node: context.node,
    });
  }

  if (parent?.type === 'union') {
    return getContextMenuUnionItems({
      doc: context.doc,
      node: context.node,
      parent,
    });
  }

  return Promise.resolve([]);
}

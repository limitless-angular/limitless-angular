import type {
  SchemaArrayItem,
  SchemaNode,
  SchemaNumberNode,
  SchemaObjectField,
  SchemaStringNode,
  SchemaUnionOption,
} from '@sanity/presentation-comlink';

type NodeIconOption =
  | SchemaNumberNode
  | SchemaStringNode
  | SchemaArrayItem
  | SchemaObjectField
  | SchemaUnionOption<SchemaNode>;

export type NodeIconDescriptor = {
  html?: string;
  label: string;
  text: string;
};

function hasCustomIcon(
  option: NodeIconOption,
): option is NodeIconOption & { icon: string } {
  return 'icon' in option && typeof option.icon === 'string' && !!option.icon;
}

function getOptionLabel(option: NodeIconOption): string {
  const labeledOption = option as { name?: string; title?: string };
  return labeledOption.title || labeledOption.name || 'Schema type';
}

export function getNodeIcon(
  option: NodeIconOption | undefined,
): NodeIconDescriptor {
  if (!option) {
    return { label: 'Document', text: 'Doc' };
  }

  if (hasCustomIcon(option)) {
    return {
      html: option.icon,
      label: getOptionLabel(option),
      text: '',
    };
  }

  if (option.type === 'string') {
    return { label: 'String', text: 'Aa' };
  }

  if (option.type === 'number') {
    return { label: 'Number', text: '123' };
  }

  const { value: node } = option;

  if (node.type === 'string') {
    return { label: 'String', text: 'Aa' };
  }

  if (node.type === 'boolean') {
    return { label: 'Boolean', text: 'Bool' };
  }

  if (node.type === 'number') {
    return { label: 'Number', text: '123' };
  }

  if (node.type === 'array' || node.type === 'union') {
    const of = Array.isArray(node.of) ? node.of : [node.of];
    if (of.some((item) => 'name' in item && item.name === 'block')) {
      return { label: 'Block content', text: 'Text' };
    }

    return { label: 'List', text: 'List' };
  }

  if (node.type === 'object') {
    if (option.name === 'image') {
      return { label: 'Image', text: 'Img' };
    }

    if (option.name === 'block') {
      return { label: 'Block', text: 'Aa' };
    }

    return { label: 'Object', text: 'Obj' };
  }

  return { label: getOptionLabel(option), text: 'Doc' };
}

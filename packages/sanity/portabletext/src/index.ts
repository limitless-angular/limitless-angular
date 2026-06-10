export {
  PortableTextComponent,
  PortableTextComponent as PortableText,
} from './components/portable-text.component';
export {
  PortableTextTypeComponent,
  PortableTextMarkComponent,
  PortableTextBlockComponent,
  PortableTextListItemComponent,
  PortableTextListComponent,
} from './directives/portable-text-directives';
export { defaultComponents } from './components/defaults/default-components';
export { mergeComponents } from './utils/merge';
export type {
  AngularPortableTextList,
  AngularPortableTextListItem,
  DefaultPortableTextBlockStyle,
  DefaultPortableTextListItem,
  DefaultPortableTextMark,
  InferComponents,
  InferStrictComponents,
  InferValue,
  MissingComponentHandler,
  NodeType,
  PortableTextAngularComponent,
  PortableTextAngularComponents,
  PortableTextBlockComponentType,
  PortableTextComponents,
  PortableTextListBlock,
  PortableTextListComponentType,
  PortableTextListItemComponentType,
  PortableTextMarkComponentType,
  PortableTextProps,
  UnknownNodeType,
} from './types';
export type { ToolkitListNestMode as ListNestMode } from '@portabletext/toolkit';
export { toPlainText } from '@portabletext/toolkit';
export type { PortableTextBlock } from '@portabletext/types';

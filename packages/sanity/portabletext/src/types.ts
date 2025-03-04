import type { Type } from '@angular/core';
import type {
  PortableTextBlock,
  PortableTextBlockStyle,
  PortableTextListItemBlock,
  PortableTextListItemType,
  TypedObject,
} from '@portabletext/types';
import type { ToolkitPortableTextList } from '@portabletext/toolkit';
import {
  PortableTextTypeComponent,
  PortableTextMarkComponent,
  PortableTextBlockComponent,
  PortableTextListItemComponent,
  PortableTextListComponent,
} from './directives/portable-text-directives';

export interface PortableTextComponents {
  types?: Record<string, Type<PortableTextTypeComponent>>;
  marks?: Record<string, Type<PortableTextMarkComponent> | undefined>;
  block?: Record<
    PortableTextBlockStyle,
    Type<PortableTextBlockComponent> | undefined
  >;
  list?: Record<PortableTextListItemType, Type<PortableTextListComponent>>;
  listItem?:
    | Record<PortableTextListItemType, Type<PortableTextListItemComponent>>
    | Type<PortableTextListItemComponent>;
  hardBreak?: Type<unknown> | false;
  unknownMark?: Type<PortableTextMarkComponent>;
  unknownBlockStyle?: Type<PortableTextBlockComponent>;
  unknownList?: Type<PortableTextListComponent>;
  unknownListItem?: Type<PortableTextListItemComponent>;
}

/**
 * Any node type that we can't identify - eg it has an `_type`,
 * but we don't know anything about its other properties
 */
export type UnknownNodeType =
  | { [key: string]: unknown; _type: string }
  | TypedObject;

export type NodeType =
  | 'block'
  | 'mark'
  | 'blockStyle'
  | 'listStyle'
  | 'listItemStyle';

export type MissingComponentHandler = (
  message: string,
  options: { type: string; nodeType: NodeType },
) => void;

export interface Serializable<T> {
  node: T;
  index: number;
  isInline: boolean;
}

export interface SerializedBlock {
  _key?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any[];
  isInline: boolean;
  node: PortableTextBlock | PortableTextListItemBlock;
}

export interface RenderNodeContext<Node extends TypedObject = TypedObject> {
  /**
   * Data associated with this portable text node, eg the raw JSON value of a block/type
   */
  $implicit: Node;
  /**
   * Index within its parent
   */
  index?: number;
  /**
   * Whether or not this node is "inline" - ie as a child of a text block,
   * alongside text spans, or a block in and of itself.
   */
  isInline: boolean;
}

export interface TemplateContext<Node extends TypedObject> {
  $implicit: Node;
  index?: number;
  isInline?: boolean;
}

// Re-exporting these as we don't want to refer to "toolkit" outside of this module

/**
 * A virtual "list" node for Portable Text - not strictly part of Portable Text,
 * but generated by this library to ease the rendering of lists in HTML etc
 */
export type PortableTextListBlock = ToolkitPortableTextList;

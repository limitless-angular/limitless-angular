import type { Type } from '@angular/core';
import type {
  ArbitraryTypedObject,
  PortableTextBlock,
  PortableTextBlockStyle,
  PortableTextListItemBlock,
  PortableTextListItemType,
  TypedObject,
} from '@portabletext/types';
import type {
  ToolkitListNestMode,
  ToolkitPortableTextList,
  ToolkitPortableTextListItem,
} from '@portabletext/toolkit';
import type {
  PortableTextTypeComponent,
  PortableTextMarkComponent,
  PortableTextBlockComponent,
  PortableTextListItemComponent,
  PortableTextListComponent,
} from './directives/portable-text-directives';

/**
 * Properties for the Portable Text Angular component.
 *
 * @template B Types that can appear in the array of blocks.
 */
export interface PortableTextProps<
  B extends TypedObject = PortableTextBlock | ArbitraryTypedObject,
> {
  /**
   * One or more blocks to render.
   */
  value: B | B[] | null | undefined;

  /**
   * Angular components to use for rendering.
   */
  components?: PortableTextComponents<B>;

  /**
   * Function to call when encountering unknown types, marks, block styles,
   * list styles, or list item styles. Prints a warning by default.
   * Pass `false` to disable.
   */
  onMissingComponent?: MissingComponentHandler | false;

  /**
   * Determines whether lists are nested inside list items (`html`) or as a
   * direct child of another list (`direct`).
   */
  listNestingMode?: ToolkitListNestMode;
}

/**
 * Any node type that we can't identify - eg it has an `_type`,
 * but we don't know anything about its other properties
 */
export type UnknownNodeType =
  | { [key: string]: unknown; _type: string }
  | TypedObject;

// Angular component classes are invariant through signal inputs, so open
// component maps need a deliberate escape hatch just like @portabletext/react.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTypedObject = any;

export type PortableTextAngularComponent<
  N extends TypedObject = AnyTypedObject,
> = Type<PortableTextTypeComponent<N>>;

export type PortableTextBlockComponentType<
  N extends TypedObject = PortableTextBlock,
> = Type<PortableTextBlockComponent<N>>;

export type PortableTextListComponentType<
  N extends TypedObject = AngularPortableTextList,
> = Type<PortableTextListComponent<N>>;

export type PortableTextListItemComponentType<
  N extends TypedObject = PortableTextListItemBlock,
> = Type<PortableTextListItemComponent<N>>;

export type PortableTextMarkComponentType<
  M extends TypedObject = AnyTypedObject,
> = Type<PortableTextMarkComponent<M>>;

type LooseRecord<K extends string, V> = Record<string, V> & {
  [P in K]?: V;
};

type TypeName<T> = T extends { _type: infer Name }
  ? Name extends string
    ? Name
    : never
  : never;

type BuiltInPortableTextString<T> = T extends string
  ? string extends T
    ? never
    : T
  : never;

type CustomPortableTextType<B extends TypedObject> = Exclude<
  B,
  { _type: 'block' }
>;

type CustomPortableTextTypeName<B extends TypedObject> = TypeName<
  CustomPortableTextType<B>
>;

type PortableTextBlockType<B extends TypedObject> = Extract<
  B,
  { _type: 'block' }
>;

export type DefaultPortableTextBlockStyle =
  BuiltInPortableTextString<PortableTextBlockStyle>;

type PortableTextBlockStyleName<B extends TypedObject> =
  PortableTextBlockType<B> extends { style?: infer Style }
    ? NonNullable<Style> extends string
      ? NonNullable<Style>
      : never
    : never;

type CustomPortableTextBlockStyleName<B extends TypedObject> = Exclude<
  PortableTextBlockStyleName<B>,
  DefaultPortableTextBlockStyle
>;

type PortableTextBlockForStyle<B extends TypedObject, Style extends string> =
  PortableTextBlockType<B> extends infer Block
    ? Block extends TypedObject
      ? Omit<Block, 'style'> & {
          style?: Extract<Block extends { style?: infer S } ? S : never, Style>;
        }
      : never
    : never;

type PortableTextBlockComponentFor<B extends TypedObject> =
  PortableTextBlockType<B> extends never
    ? PortableTextBlockComponentType
    : PortableTextAngularComponent<PortableTextBlockType<B>>;

type PortableTextBlockComponents<B extends TypedObject> =
  string extends PortableTextBlockStyleName<B>
    ? LooseRecord<
        PortableTextBlockStyle,
        PortableTextBlockComponentType | undefined
      >
    : PortableTextBlockStyleName<B> extends never
      ? LooseRecord<
          PortableTextBlockStyle,
          PortableTextBlockComponentType | undefined
        >
      : Record<
          string,
          PortableTextAngularComponent<AnyTypedObject> | undefined
        > & {
          [Style in PortableTextBlockStyleName<B>]?: PortableTextAngularComponent<
            PortableTextBlockForStyle<B, Style>
          >;
        };

type PortableTextListItemName<B extends TypedObject> =
  PortableTextBlockType<B> extends { listItem?: infer ListItem }
    ? NonNullable<ListItem> extends string
      ? NonNullable<ListItem>
      : never
    : never;

export type DefaultPortableTextListItem =
  BuiltInPortableTextString<PortableTextListItemType>;

type CustomPortableTextListItemName<B extends TypedObject> = Exclude<
  PortableTextListItemName<B>,
  DefaultPortableTextListItem
>;

type PortableTextListForItem<ListItem extends string> =
  AngularPortableTextList extends infer List
    ? List extends AngularPortableTextList
      ? Omit<List, 'listItem'> & { listItem: ListItem }
      : never
    : never;

type PortableTextBlockForListItem<
  B extends TypedObject,
  ListItem extends string,
> =
  PortableTextBlockType<B> extends infer Block
    ? Block extends TypedObject
      ? Omit<Block, 'listItem'> & {
          listItem: Extract<
            Block extends { listItem?: infer Item } ? Item : never,
            ListItem
          >;
        }
      : never
    : never;

type PortableTextListComponentFor<B extends TypedObject> =
  PortableTextListItemName<B> extends never
    ? PortableTextListComponentType
    : PortableTextAngularComponent<
        PortableTextListForItem<PortableTextListItemName<B>>
      >;

type PortableTextListItemComponentFor<B extends TypedObject> =
  PortableTextListItemName<B> extends never
    ? PortableTextListItemComponentType
    : PortableTextAngularComponent<
        PortableTextBlockForListItem<B, PortableTextListItemName<B>>
      >;

type PortableTextListComponents<B extends TypedObject> =
  string extends PortableTextListItemName<B>
    ? LooseRecord<
        PortableTextListItemType,
        PortableTextListComponentType | undefined
      >
    : PortableTextListItemName<B> extends never
      ? Record<string, PortableTextAngularComponent<AnyTypedObject> | undefined>
      : Record<
          string,
          PortableTextAngularComponent<AnyTypedObject> | undefined
        > & {
          [ListItem in PortableTextListItemName<B>]?: PortableTextAngularComponent<
            PortableTextListForItem<ListItem>
          >;
        };

type PortableTextListItemComponents<B extends TypedObject> =
  string extends PortableTextListItemName<B>
    ? LooseRecord<
        PortableTextListItemType,
        PortableTextListItemComponentType | undefined
      >
    : PortableTextListItemName<B> extends never
      ? Record<string, PortableTextAngularComponent<AnyTypedObject> | undefined>
      : Record<
          string,
          PortableTextAngularComponent<AnyTypedObject> | undefined
        > & {
          [ListItem in PortableTextListItemName<B>]?: PortableTextAngularComponent<
            PortableTextBlockForListItem<B, ListItem>
          >;
        };

type PortableTextMarkType<B extends TypedObject> =
  PortableTextBlockType<B> extends { markDefs?: infer MarkDefs }
    ? NonNullable<MarkDefs> extends readonly (infer MarkDef)[]
      ? Extract<MarkDef, TypedObject>
      : never
    : never;

type PortableTextMarkTypeName<B extends TypedObject> = TypeName<
  PortableTextMarkType<B>
>;

export type DefaultPortableTextMark =
  | 'em'
  | 'strong'
  | 'code'
  | 'underline'
  | 'strike-through'
  | 'link';

type CustomPortableTextMarkTypeName<B extends TypedObject> = Exclude<
  PortableTextMarkTypeName<B>,
  DefaultPortableTextMark
>;

type PortableTextMarkComponents<B extends TypedObject> =
  string extends PortableTextMarkTypeName<B>
    ? Record<string, PortableTextMarkComponentType<AnyTypedObject> | undefined>
    : PortableTextMarkTypeName<B> extends never
      ? Record<
          string,
          PortableTextMarkComponentType<AnyTypedObject> | undefined
        >
      : Record<
          string,
          PortableTextMarkComponentType<AnyTypedObject> | undefined
        > & {
          [Type in PortableTextMarkTypeName<B>]?: PortableTextMarkComponentType<
            Extract<PortableTextMarkType<B>, { _type: Type }>
          >;
        };

type PortableTextTypeComponents<B extends TypedObject> =
  string extends CustomPortableTextTypeName<B>
    ? Record<string, PortableTextAngularComponent<AnyTypedObject> | undefined>
    : CustomPortableTextTypeName<B> extends never
      ? Record<string, PortableTextAngularComponent<AnyTypedObject> | undefined>
      : Record<
          string,
          PortableTextAngularComponent<AnyTypedObject> | undefined
        > & {
          [Type in CustomPortableTextTypeName<B>]?: PortableTextAngularComponent<
            Extract<CustomPortableTextType<B>, { _type: Type }>
          >;
        };

type PortableTextValueItem<T> = Extract<
  NonNullable<T> extends readonly (infer B)[] ? B : NonNullable<T>,
  TypedObject
>;

type PortableTextArrayItem<T> =
  NonNullable<T> extends readonly (infer Item)[]
    ? Extract<NonNullable<Item>, { _type: 'block' }> extends never
      ? never
      : Extract<NonNullable<Item>, TypedObject>
    : never;

type InferPortableTextTypedObject<T> = T extends unknown
  ? PortableTextArrayItem<T> extends never
    ? NonNullable<T> extends readonly (infer Item)[]
      ? InferPortableTextTypedObject<Item>
      : NonNullable<T> extends object
        ? {
            [Key in keyof NonNullable<T>]: InferPortableTextTypedObject<
              NonNullable<T>[Key]
            >;
          }[keyof NonNullable<T>]
        : never
    : PortableTextArrayItem<T>
  : never;

type StrictPortableTextTypeComponents<B extends TypedObject> =
  string extends CustomPortableTextTypeName<B>
    ? Record<string, PortableTextAngularComponent | undefined>
    : CustomPortableTextTypeName<B> extends never
      ? Record<string, never>
      : {
          [Type in CustomPortableTextTypeName<B>]-?: PortableTextAngularComponent<
            Extract<CustomPortableTextType<B>, { _type: Type }>
          >;
        };

type StrictPortableTextTypeComponentOverrides<B extends TypedObject> =
  CustomPortableTextTypeName<B> extends never
    ? { types?: StrictPortableTextTypeComponents<B> }
    : { types: StrictPortableTextTypeComponents<B> };

type StrictPortableTextMarkComponents<B extends TypedObject> =
  string extends PortableTextMarkTypeName<B>
    ? Record<string, PortableTextMarkComponentType | undefined>
    : PortableTextMarkTypeName<B> extends never
      ? Record<string, never>
      : {
          [Type in CustomPortableTextMarkTypeName<B>]-?: PortableTextMarkComponentType<
            Extract<PortableTextMarkType<B>, { _type: Type }>
          >;
        } & {
          [Type in Extract<
            DefaultPortableTextMark,
            PortableTextMarkTypeName<B>
          >]?: PortableTextMarkComponentType<
            Extract<PortableTextMarkType<B>, { _type: Type }>
          >;
        };

type StrictPortableTextMarkComponentOverrides<B extends TypedObject> =
  CustomPortableTextMarkTypeName<B> extends never
    ? { marks?: StrictPortableTextMarkComponents<B> }
    : { marks: StrictPortableTextMarkComponents<B> };

type StrictPortableTextBlockComponents<B extends TypedObject> =
  string extends PortableTextBlockStyleName<B>
    ? LooseRecord<
        PortableTextBlockStyle,
        PortableTextBlockComponentType | undefined
      >
    : PortableTextBlockStyleName<B> extends never
      ? Record<string, never>
      : {
          [Style in CustomPortableTextBlockStyleName<B>]-?: PortableTextAngularComponent<
            PortableTextBlockForStyle<B, Style>
          >;
        } & {
          [Style in Extract<
            DefaultPortableTextBlockStyle,
            PortableTextBlockStyleName<B>
          >]?: PortableTextAngularComponent<
            PortableTextBlockForStyle<B, Style>
          >;
        };

type StrictPortableTextBlockComponentOverrides<B extends TypedObject> =
  CustomPortableTextBlockStyleName<B> extends never
    ? {
        block?:
          | StrictPortableTextBlockComponents<B>
          | PortableTextBlockComponentFor<B>;
      }
    : {
        block:
          | StrictPortableTextBlockComponents<B>
          | PortableTextBlockComponentFor<B>;
      };

type StrictPortableTextListComponents<B extends TypedObject> =
  string extends PortableTextListItemName<B>
    ? LooseRecord<
        PortableTextListItemType,
        PortableTextListComponentType | undefined
      >
    : PortableTextListItemName<B> extends never
      ? Record<string, never>
      : {
          [ListItem in CustomPortableTextListItemName<B>]-?: PortableTextAngularComponent<
            PortableTextListForItem<ListItem>
          >;
        } & {
          [ListItem in Extract<
            DefaultPortableTextListItem,
            PortableTextListItemName<B>
          >]?: PortableTextAngularComponent<PortableTextListForItem<ListItem>>;
        };

type StrictPortableTextListComponentOverrides<B extends TypedObject> =
  CustomPortableTextListItemName<B> extends never
    ? {
        list?:
          | StrictPortableTextListComponents<B>
          | PortableTextListComponentFor<B>;
      }
    : {
        list:
          | StrictPortableTextListComponents<B>
          | PortableTextListComponentFor<B>;
      };

type StrictPortableTextListItemComponents<B extends TypedObject> =
  string extends PortableTextListItemName<B>
    ? LooseRecord<
        PortableTextListItemType,
        PortableTextListItemComponentType | undefined
      >
    : PortableTextListItemName<B> extends never
      ? Record<string, never>
      : {
          [ListItem in PortableTextListItemName<B>]-?: PortableTextAngularComponent<
            PortableTextBlockForListItem<B, ListItem>
          >;
        };

type StrictPortableTextListItemComponentOverrides<B extends TypedObject> = {
  listItem?:
    | StrictPortableTextListItemComponents<B>
    | PortableTextListItemComponentFor<B>;
};

/**
 * Object defining Angular component overrides for Portable Text rendering.
 */
export interface PortableTextComponents<
  B extends TypedObject = AnyTypedObject,
> {
  types?: PortableTextTypeComponents<B>;
  marks?: PortableTextMarkComponents<B>;
  block?: PortableTextBlockComponents<B> | PortableTextBlockComponentFor<B>;
  list?: PortableTextListComponents<B> | PortableTextListComponentFor<B>;
  listItem?:
    | PortableTextListItemComponents<B>
    | PortableTextListItemComponentFor<B>;
  hardBreak?: Type<unknown> | false;
  unknownMark?: PortableTextMarkComponentType;
  unknownType?: PortableTextAngularComponent<UnknownNodeType>;
  unknownBlockStyle?: PortableTextBlockComponentType;
  unknownList?: PortableTextListComponentType<AngularPortableTextList>;
  unknownListItem?: PortableTextListItemComponentType<PortableTextListItemBlock>;
}

export type InferComponents<T> = PortableTextComponents<
  PortableTextValueItem<T>
>;

export type InferValue<T> = Exclude<
  InferPortableTextTypedObject<T>,
  undefined
>[];

export type InferStrictComponents<T> = Omit<
  PortableTextComponents<PortableTextValueItem<T>>,
  'types' | 'marks' | 'block' | 'list' | 'listItem'
> &
  StrictPortableTextTypeComponentOverrides<PortableTextValueItem<T>> &
  StrictPortableTextMarkComponentOverrides<PortableTextValueItem<T>> &
  StrictPortableTextBlockComponentOverrides<PortableTextValueItem<T>> &
  StrictPortableTextListComponentOverrides<PortableTextValueItem<T>> &
  StrictPortableTextListItemComponentOverrides<PortableTextValueItem<T>>;

/**
 * Object defining the different Angular components to use for rendering
 * Portable Text and user-provided types.
 */
export interface PortableTextAngularComponents<
  B extends TypedObject = AnyTypedObject,
> {
  types: PortableTextTypeComponents<B>;
  marks: PortableTextMarkComponents<B>;
  block: PortableTextBlockComponents<B> | PortableTextBlockComponentFor<B>;
  list: PortableTextListComponents<B> | PortableTextListComponentFor<B>;
  listItem:
    | PortableTextListItemComponents<B>
    | PortableTextListItemComponentFor<B>;
  hardBreak: Type<unknown> | false;
  unknownMark: PortableTextMarkComponentType;
  unknownType: PortableTextAngularComponent<UnknownNodeType>;
  unknownBlockStyle: PortableTextBlockComponentType;
  unknownList: PortableTextListComponentType<AngularPortableTextList>;
  unknownListItem: PortableTextListItemComponentType<PortableTextListItemBlock>;
}

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
  _key: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any[];
  index: number;
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
export type AngularPortableTextList = ToolkitPortableTextList;

export type PortableTextListBlock = AngularPortableTextList;

/**
 * A virtual "list item" node for Portable Text - not strictly any different
 * from a regular Portable Text Block, but guaranteed to have a `listItem`.
 */
export type AngularPortableTextListItem = ToolkitPortableTextListItem;

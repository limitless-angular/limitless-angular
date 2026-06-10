import { expectTypeOf, test } from 'vitest';
import type {
  PortableTextBlock,
  PortableTextMarkDefinition,
  PortableTextSpan,
} from '@portabletext/types';

import {
  AngularPortableTextList,
  InferComponents,
  InferStrictComponents,
  InferValue,
  PortableTextBlockComponent,
  PortableTextListComponent,
  PortableTextListItemComponent,
  PortableTextMarkComponent,
  PortableTextProps,
  PortableTextTypeComponent,
} from '../index';

interface ImageType {
  _type: 'image';
  asset: { _ref: string };
}

interface HighlightMark extends PortableTextMarkDefinition {
  _type: 'highlight';
  color: string;
}

interface LinkMark extends PortableTextMarkDefinition {
  _type: 'link';
  href: string;
}

type PostBlock = PortableTextBlock<
  HighlightMark | LinkMark,
  PortableTextSpan,
  'normal' | 'callout',
  'bullet' | 'checklist'
> & { _type: 'block' };

type CalloutBlock = Omit<PostBlock, 'style'> & { style?: 'callout' };
type ChecklistList = AngularPortableTextList extends infer List
  ? List extends AngularPortableTextList
    ? Omit<List, 'listItem'> & { listItem: 'checklist' }
    : never
  : never;
type BulletListItem = Omit<PostBlock, 'listItem'> & { listItem: 'bullet' };
type ChecklistListItem = Omit<PostBlock, 'listItem'> & {
  listItem: 'checklist';
};
type AnyListItem = Omit<PostBlock, 'listItem'> & {
  listItem: 'bullet' | 'checklist';
};

type PostContent = (PostBlock | ImageType)[];

class ImageComponent extends PortableTextTypeComponent<ImageType> {}
class HighlightComponent extends PortableTextMarkComponent<HighlightMark> {}
class CalloutBlockComponent extends PortableTextBlockComponent<CalloutBlock> {}
class ChecklistComponent extends PortableTextListComponent<ChecklistList> {}
class AnyListItemComponent extends PortableTextListItemComponent<AnyListItem> {}
class BulletListItemComponent extends PortableTextListItemComponent<BulletListItem> {}
class ChecklistListItemComponent extends PortableTextListItemComponent<ChecklistListItem> {}

test('infers portable text values from query result shapes', () => {
  type InferredValue = InferValue<{ content: PostContent | null }>;

  expectTypeOf<InferredValue>().toEqualTypeOf<PostContent>();
});

test('infers component maps from portable text values', () => {
  const components = {
    types: { image: ImageComponent },
    marks: { highlight: HighlightComponent },
    block: { callout: CalloutBlockComponent },
    list: { checklist: ChecklistComponent },
    listItem: AnyListItemComponent,
  } satisfies InferComponents<PostContent>;

  expectTypeOf(components).toBeObject();
});

test('strict component maps require all custom handlers', () => {
  const components = {
    types: { image: ImageComponent },
    marks: { highlight: HighlightComponent },
    block: { callout: CalloutBlockComponent },
    list: { checklist: ChecklistComponent },
    listItem: {
      bullet: BulletListItemComponent,
      checklist: ChecklistListItemComponent,
    },
  } satisfies InferStrictComponents<PostContent>;

  expectTypeOf(components).toBeObject();
});

test('strict component maps reject missing custom handlers', () => {
  const components = {
    // @ts-expect-error image handler is required by strict components
    types: {},
    marks: { highlight: HighlightComponent },
    block: { callout: CalloutBlockComponent },
    list: { checklist: ChecklistComponent },
    listItem: {
      bullet: BulletListItemComponent,
      checklist: ChecklistListItemComponent,
    },
  } satisfies InferStrictComponents<PostContent>;

  expectTypeOf(components).toBeObject();
});

test('portable text props accept null and undefined values', () => {
  expectTypeOf<PortableTextProps<PostBlock>['value']>().toEqualTypeOf<
    PostBlock | PostBlock[] | null | undefined
  >();
});

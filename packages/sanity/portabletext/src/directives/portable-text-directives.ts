import {
  AfterViewInit,
  Directive,
  effect,
  inject,
  input,
  viewChild,
  ViewContainerRef,
} from '@angular/core';

import {
  PortableTextBlock,
  PortableTextListItemBlock,
  TypedObject,
} from '@portabletext/types';

import { PortableTextListBlock } from '../types';
import { PORTABLE_TEXT_RENDERER_CONTEXT } from '../tokens';

// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[portableTextContent]' })
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class DynamicPortableTextContent<Node extends TypedObject = TypedObject>
  implements AfterViewInit
{
  children =
    input.required<(TypedObject & { index?: number; isInline?: boolean })[]>();
  container = viewChild<ViewContainerRef, ViewContainerRef>('children', {
    read: ViewContainerRef,
  });
  template = inject(PORTABLE_TEXT_RENDERER_CONTEXT).childrenTmpl;

  // eslint-disable-next-line no-unused-private-class-members
  #_ = effect(() => {
    this.container()?.clear();
    this.container()?.createEmbeddedView(this.template(), {
      children: this.children(),
    });
  });

  /**
   * @deprecated empty hook that is used just to avoid a breaking change, it will be removed in a major version
   */
  // eslint-disable-next-line @angular-eslint/no-empty-lifecycle-method
  ngAfterViewInit() {
    /* empty */
  }
}

// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[portableTextMark]' })
/**
 * @template M Shape describing the data associated with this mark, if it is an annotation
 */
export class PortableTextMarkComponent<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  M extends TypedObject = any,
> extends DynamicPortableTextContent<M> {
  /**
   * Mark definition, e.g. the actual data of the annotation. If the mark is a simple decorator, this will be `undefined`
   */
  value = input<M>();

  /**
   * Text content of this mark
   */
  text = input.required<string>();

  /**
   * Key for this mark. The same key can be used amongst multiple text spans within the same block, so don't rely on this for Angular keys.
   */
  markKey = input<string>();

  /**
   * Type of mark - ie value of `_type` in the case of annotations, or the name of the decorator otherwise - eg `em`, `italic`.
   */
  markType = input.required<string>();
}

// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[portableTextType]' })
/**
 * Data associated with this portable text node, eg the raw JSON value of a block/type
 */
export class PortableTextTypeComponent<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends TypedObject = any,
> extends DynamicPortableTextContent<T> {
  value = input.required<T>();

  /**
   * Index within its parent.
   */
  index = input(0);

  /**
   * Whether this node is "inline" - ie as a child of a text block,
   * alongside text spans, or a block in and of itself.
   */
  isInline = input.required<boolean>();
}

// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[portableTextBlock]' })
export class PortableTextBlockComponent<
  T extends TypedObject = PortableTextBlock,
> extends PortableTextTypeComponent<T> {}

// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[portableTextList]' })
export class PortableTextListComponent<
  T extends TypedObject = PortableTextListBlock,
> extends PortableTextTypeComponent<T> {}

// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[portableTextListItem]' })
export class PortableTextListItemComponent<
  T extends TypedObject = PortableTextListItemBlock,
> extends PortableTextTypeComponent<T> {}

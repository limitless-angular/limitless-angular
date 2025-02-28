import {
  AfterViewInit,
  Directive,
  effect,
  input,
  TemplateRef,
  viewChild,
  ViewContainerRef,
} from '@angular/core';

import {
  PortableTextBlock,
  PortableTextListItemBlock,
  TypedObject,
} from '@portabletext/types';

import { PortableTextListBlock, RenderNodeContext } from '../types';

// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[portableTextContent]', standalone: true })
// eslint-disable-next-line @angular-eslint/directive-class-suffix
export class DynamicPortableTextContent<Node extends TypedObject = TypedObject>
  implements AfterViewInit
{
  template = input.required<TemplateRef<RenderNodeContext<Node>>>();
  context = input.required<RenderNodeContext<Node>>();
  children = viewChild<ViewContainerRef, ViewContainerRef>('children', {
    read: ViewContainerRef,
  });
  _ = effect(() =>
    this.children()?.createEmbeddedView(this.template(), this.context()),
  );

  /**
   * @deprecated empty hook that is used just to avoid a breaking change, it will be removed in a major version
   */
  // eslint-disable-next-line @angular-eslint/no-empty-lifecycle-method
  ngAfterViewInit() {
    /* empty */
  }
}

// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[portableTextMark]', standalone: true })
/**
 * @template M Shape describing the data associated with this mark, if it is an annotation
 */
// eslint-disable-next-line @angular-eslint/directive-class-suffix
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
@Directive({ selector: '[portableTextType]', standalone: true })
/**
 * Data associated with this portable text node, eg the raw JSON value of a block/type
 */
// eslint-disable-next-line @angular-eslint/directive-class-suffix
export class PortableTextTypeComponent<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends TypedObject = any,
> extends DynamicPortableTextContent<T> {
  value = input.required<T>();

  /**
   * Whether this node is "inline" - ie as a child of a text block,
   * alongside text spans, or a block in and of itself.
   */
  isInline = input.required<boolean>();
}

// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[portableTextBlock]', standalone: true })
// eslint-disable-next-line @angular-eslint/directive-class-suffix
export class PortableTextBlockComponent extends PortableTextTypeComponent<PortableTextBlock> {}

// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[portableTextListItem]', standalone: true })
// eslint-disable-next-line @angular-eslint/directive-class-suffix
export class PortableTextListComponent extends PortableTextTypeComponent<PortableTextListBlock> {}

// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[portableTextListItem]', standalone: true })
// eslint-disable-next-line @angular-eslint/directive-class-suffix
export class PortableTextListItemComponent extends PortableTextTypeComponent<PortableTextListItemBlock> {
  index = input.required<number>();
}

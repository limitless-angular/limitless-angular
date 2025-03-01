import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  inject,
  Injector,
  input,
  TemplateRef,
  Type,
  viewChild,
  ViewContainerRef,
  ViewEncapsulation,
} from '@angular/core';
import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';

import {
  isPortableTextBlock,
  isPortableTextListItemBlock,
  isPortableTextToolkitList,
  isPortableTextToolkitSpan,
  isPortableTextToolkitTextNode,
  LIST_NEST_MODE_HTML,
  nestLists,
} from '@portabletext/toolkit';
import {
  ArbitraryTypedObject,
  PortableTextBlock,
  TypedObject,
} from '@portabletext/types';

import { BlockComponent } from './block.component';
import {
  MissingComponentHandler,
  PortableTextComponents,
  RenderNodeContext,
} from '../types';
import { TextComponent } from './text.component';
import { SpanComponent } from './span.component';
import { ListComponent } from './list.component';
import { ListItemComponent } from './list-item.component';
import { trackBy } from '../utils';
import { MISSING_COMPONENT_HANDLER } from '../tokens';
import { printWarning } from '../warnings';
import { mergeComponents } from '../utils/merge';
import { defaultComponents } from './defaults/default-components';
import { ChildrenComponent } from './children.component';

/**
 * PortableTextComponent is the main component for rendering Portable Text content.
 * It provides a flexible and customizable way to render rich text content with support
 * for various block types, marks, lists, and custom components.
 *
 * @example
 * ```html
 * <div [portable-text]="portableTextValue" [components]="customComponents"></div>
 * ```
 *
 * @template B The type of blocks to render, defaults to PortableTextBlock | ArbitraryTypedObject
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: '[portable-text]',
  imports: [NgTemplateOutlet, NgComponentOutlet],
  template: `
    @for (
      block of nestedBlocks();
      track trackBy(block._key, index);
      let index = $index
    ) {
      <ng-container
        *ngTemplateOutlet="
          renderNode;
          context: { $implicit: block, index, isInline: false }
        "
      />
    }

    <ng-template #renderNode let-node let-index="index" let-isInline="isInline">
      @if (isPortableTextToolkitList(node)) {
        <ng-container
          *ngTemplateOutlet="listTemplate(); context: { $implicit: node }"
        />
      } @else if (isPortableTextListItemBlock(node)) {
        <ng-container
          *ngTemplateOutlet="
            listItemTemplate();
            context: { $implicit: node, index }
          "
        />
      } @else if (isPortableTextToolkitSpan(node)) {
        <ng-container
          *ngTemplateOutlet="spanTemplate(); context: { $implicit: node }"
        />
      } @else if (hasCustomComponentForNode(node)) {
        <ng-container
          *ngComponentOutlet="
            getCustomComponentForNode(node);
            inputs: { value: node, isInline }
          "
        />
      } @else if (isPortableTextBlock(node)) {
        <ng-container
          *ngTemplateOutlet="
            blockTemplate();
            context: { $implicit: node, index, isInline }
          "
        />
      } @else if (isPortableTextToolkitTextNode(node)) {
        <ng-container
          *ngTemplateOutlet="textTemplate(); context: { $implicit: node }"
        />
      } @else {
        <ng-container
          *ngTemplateOutlet="unknownTypeTmpl; context: { node, isInline }"
        />
      }
    </ng-template>

    <ng-template #unknownTypeTmpl let-value="node" let-isInline="isInline">
      <ng-container
        *ngTemplateOutlet="unknownBlock; context: { node: value, isInline }"
      />
    </ng-template>

    <ng-template #unknownBlock let-value="node" let-isInline="isInline">
      @if (isInline) {
        <span style="display: none" aria-hidden="true">{{
          'Unknown block type: ' + value._type
        }}</span>
      } @else {
        <div style="display: none" aria-hidden="true">
          {{ 'Unknown block type: ' + value._type }}
        </div>
      }
    </ng-template>
  `,
  styles: `
    .portable-text {
      display: block;
    }
  `,
  host: { '[class.portable-text]': 'true' },
  providers: [
    {
      provide: MISSING_COMPONENT_HANDLER,
      useFactory: (component: PortableTextComponent) =>
        component.onMissingComponent() || noop,
      deps: [forwardRef(() => PortableTextComponent)],
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class PortableTextComponent<
  B extends TypedObject = PortableTextBlock | ArbitraryTypedObject,
> {
  /**
   * The Portable Text content to render.
   * Can be a single block or an array of blocks.
   */
  value = input.required<B | B[]>();

  /**
   * Custom components to override the default rendering.
   * @see PortableTextComponents
   */
  componentOverrides = input<Partial<PortableTextComponents>>(
    {},
    // eslint-disable-next-line @angular-eslint/no-input-rename
    { alias: 'components' },
  );

  /**
   * Template reference for rendering nodes
   */
  renderNode =
    viewChild.required<TemplateRef<RenderNodeContext<B>>>('renderNode');

  /**
   * Template reference for rendering unknown blocks
   */
  unknownBlockTmpl =
    viewChild.required<TemplateRef<{ $implicit: TypedObject }>>('unknownBlock');

  /**
   * Handler for missing components.
   * Set to false to disable warnings.
   */
  onMissingComponent = input<MissingComponentHandler | false>(printWarning);

  #vcr = inject(ViewContainerRef);
  #injector = inject(Injector);

  /**
   * Merged components from default and overrides
   */
  components = computed(() =>
    mergeComponents(defaultComponents, this.componentOverrides()),
  );

  /**
   * Creates a template for rendering blocks
   */
  blockTemplate = computed(() => this.#createComponent(BlockComponent));

  /**
   * Creates a template for rendering children
   */
  childrenTmpl = computed(() => this.#createComponent(ChildrenComponent));

  /**
   * Creates a template for rendering lists
   */
  listTemplate = computed(() => this.#createComponent(ListComponent));

  /**
   * Creates a template for rendering list items
   */
  listItemTemplate = computed(() => this.#createComponent(ListItemComponent));

  /**
   * Creates a template for rendering spans
   */
  spanTemplate = computed(() => this.#createComponent(SpanComponent));

  /**
   * Creates a template for rendering text
   */
  textTemplate = computed(() => this.#createComponent(TextComponent));

  /**
   * Computes the nested blocks from the input value
   * Handles both single blocks and arrays of blocks
   */
  nestedBlocks = computed(() => {
    const blocks = Array.isArray(this.value()) ? this.value() : [this.value()];
    return nestLists(blocks as TypedObject[], LIST_NEST_MODE_HTML);
  });

  /**
   * Checks if a custom component exists for the given node
   *
   * @param node The node to check
   * @returns True if a custom component exists for the node
   */
  hasCustomComponentForNode = (node: TypedObject): boolean =>
    node._type in this.components().types;

  /**
   * Gets the custom component for the given node
   *
   * @param node The node to get the component for
   * @returns The component type for the node
   */
  getCustomComponentForNode = (node: TypedObject): Type<unknown> =>
    this.components().types?.[node._type] as Type<unknown>;

  /**
   * Creates a component instance and returns its template
   *
   * @param componentType The component type to create
   * @returns The template from the component instance
   */
  #createComponent<T extends { template(): TemplateRef<unknown> }>(
    componentType: Type<T>,
  ): TemplateRef<unknown> {
    return this.#vcr
      .createComponent(componentType, { injector: this.#injector })
      .instance.template();
  }

  // Type guards for template use
  protected readonly isPortableTextToolkitList = isPortableTextToolkitList;
  protected readonly isPortableTextListItemBlock = isPortableTextListItemBlock;
  protected readonly isPortableTextBlock = isPortableTextBlock;
  protected readonly isPortableTextToolkitSpan = isPortableTextToolkitSpan;
  protected readonly isPortableTextToolkitTextNode =
    isPortableTextToolkitTextNode;
  protected readonly trackBy = trackBy;
}

const noop = () => {
  /* empty */
};

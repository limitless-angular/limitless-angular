import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injector,
  input,
  TemplateRef,
  Type,
  viewChild,
  ViewContainerRef,
  ViewEncapsulation,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import { LIST_NEST_MODE_HTML, nestLists } from '@portabletext/toolkit';
import {
  ArbitraryTypedObject,
  PortableTextBlock,
  TypedObject,
} from '@portabletext/types';

import {
  MissingComponentHandler,
  PortableTextComponents,
  RenderNodeContext,
} from '../types';
import { printWarning } from '../warnings';
import { mergeComponents } from '../utils/merge';
import { defaultComponents } from './defaults/default-components';
import { ChildrenComponent } from './children.component';
import { NodeRendererComponent } from './node-renderer.component';
import { injectResolveNode } from '../services/node-resolver.service';
import { TextComponent } from './text.component';

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
  imports: [NgTemplateOutlet],
  template: `
    <ng-container
      *ngTemplateOutlet="
        childrenTmpl();
        context: { children: nestedBlocks(), isInline: false }
      "
    />

    <ng-template #renderNode let-node let-index="index" let-isInline="isInline">
      @if (resolveNode(node, index, isInline); as nodeRendering) {
        <ng-container
          [ngTemplateOutlet]="nodeRendering.template"
          [ngTemplateOutletContext]="nodeRendering.context"
        />
      }
    </ng-template>

    <ng-template #unknownTmpl let-node="node" let-isInline="isInline">
      @if (isInline) {
        <span style="display: none" aria-hidden="true">{{
          'Unknown block type: ' + node._type
        }}</span>
      } @else {
        <!-- display: inline -->
        <div style="display: none" aria-hidden="true">{{
          'Unknown block type: ' + node._type
        }}</div>
      }
    </ng-template>
  `,
  styles: `
    .portable-text {
      display: block;
    }
  `,
  host: { '[class.portable-text]': 'true' },
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
   * Handler for missing components.
   * Set to false to disable warnings.
   */
  onMissingComponent = input<MissingComponentHandler | false>(printWarning);

  #vcr = inject(ViewContainerRef);
  #injector = inject(Injector);
  #resolveNode = injectResolveNode();

  /**
   * Merged components from default and overrides
   */
  availableComponents = computed(() =>
    mergeComponents(defaultComponents, this.componentOverrides()),
  );

  /**
   * Template reference for rendering unknown block types
   */
  unknownTmpl =
    viewChild.required<TemplateRef<{ node: TypedObject; isInline: boolean }>>(
      'unknownTmpl',
    );

  /**
   * Creates a template for rendering children
   */
  childrenTmpl = computed(() => this.#createComponent(ChildrenComponent));

  /**
   * Creates a template for rendering text
   */
  textTmpl = computed(() => this.#createComponent(TextComponent));

  /**
   * Creates a template for the node renderer
   */
  nodeRendererTmpl = computed(() =>
    this.#createComponent(NodeRendererComponent),
  );

  /**
   * Computes the nested blocks from the input value
   * Handles both single blocks and arrays of blocks
   */
  nestedBlocks = computed(() => {
    const blocks = Array.isArray(this.value()) ? this.value() : [this.value()];
    return nestLists(blocks as TypedObject[], LIST_NEST_MODE_HTML);
  });

  /**
   * Resolves the template and context for rendering a node
   *
   * @param node The node to resolve
   * @param index The index of the node
   * @param isInline Whether the node is inline
   * @returns An object containing the template and context for rendering the node
   */
  resolveNode(node: TypedObject, index?: number, isInline = false) {
    return this.#resolveNode(
      node,
      this.availableComponents(),
      this.onMissingComponent() || noop,
      {
        nodeRenderer: this.nodeRendererTmpl(),
        text: this.textTmpl(),
        unknown: this.unknownTmpl(),
      },
      index,
      isInline,
    );
  }

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
}

const noop = () => {
  /* empty */
};

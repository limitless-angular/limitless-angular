import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
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
import { MissingComponentHandler, PortableTextComponents } from '../types';
import { TextComponent } from './text.component';
import { SpanComponent } from './span.component';
import { ListComponent } from './list.component';
import { ListItemComponent } from './list-item.component';
import { trackBy } from '../utils';
import { MISSING_COMPONENT_HANDLER } from '../tokens';
import { printWarning } from '../warnings';

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
          context: {
            $implicit: block,
            isInline: false,
            components: components(),
          }
        "
      />
    }

    <ng-template
      #renderNode
      let-node
      let-index="index"
      let-isInline="isInline"
      let-components="components"
    >
      @if (isPortableTextToolkitList(node)) {
        <ng-container
          *ngTemplateOutlet="
            listTemplate().template();
            context: {
              $implicit: node,
              components,
              renderNode,
            }
          "
        />
      } @else if (isPortableTextListItemBlock(node)) {
        <ng-container
          *ngTemplateOutlet="
            listItemTemplate().template();
            context: {
              $implicit: node,
              index,
              components,
              renderNode,
            }
          "
        />
      } @else if (isPortableTextToolkitSpan(node)) {
        <ng-container
          *ngTemplateOutlet="
            spanTemplate().template();
            context: {
              $implicit: node,
              components,
              renderNode,
            }
          "
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
            blockTemplate().template();
            context: { $implicit: node, isInline, components, renderNode }
          "
        />
      } @else if (isPortableTextToolkitTextNode(node)) {
        <ng-container
          *ngTemplateOutlet="
            textTemplate().template();
            context: { $implicit: node, components }
          "
        />
      } @else {
        <ng-container
          *ngTemplateOutlet="
            unknownTypeTmpl;
            context: { node, components, isInline }
          "
        />
      }
    </ng-template>

    <ng-template
      #unknownTypeTmpl
      let-value="node"
      let-components="components"
      let-isInline="isInline"
    >
      <ng-container
        *ngTemplateOutlet="unknownBlock; context: { node: value, isInline }"
      />
    </ng-template>

    <ng-template #unknownBlock let-value="node" let-isInline="isInline">
      @if (isInline) {
        <span style="display: none">{{
          'Unknown block type: ' + value._type
        }}</span>
      } @else {
        <div style="display: none">
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
  value = input.required<B | B[]>();
  components = input<Partial<PortableTextComponents>>({});

  unknownBlockTmpl =
    viewChild.required<TemplateRef<{ $implicit: TypedObject }>>('unknownBlock');

  onMissingComponent = input<MissingComponentHandler | false>(printWarning);

  #container = inject(ViewContainerRef);

  #injector = inject(Injector);

  blockTemplate = computed(
    () =>
      this.#container.createComponent(BlockComponent, {
        injector: this.#injector,
      }).instance,
  );
  listTemplate = computed(
    () =>
      this.#container.createComponent(ListComponent, {
        injector: this.#injector,
      }).instance,
  );
  listItemTemplate = computed(
    () =>
      this.#container.createComponent(ListItemComponent, {
        injector: this.#injector,
      }).instance,
  );
  spanTemplate = computed(
    () =>
      this.#container.createComponent(SpanComponent, {
        injector: this.#injector,
      }).instance,
  );
  textTemplate = computed(
    () =>
      this.#container.createComponent(TextComponent, {
        injector: this.#injector,
      }).instance,
  );

  nestedBlocks = computed(() => {
    const blocks = Array.isArray(this.value()) ? this.value() : [this.value()];
    return nestLists(blocks as TypedObject[], LIST_NEST_MODE_HTML);
  });

  hasCustomComponentForNode = (node: TypedObject): boolean =>
    !!this.components().types?.[node._type];

  getCustomComponentForNode = (node: TypedObject): Type<unknown> =>
    this.components().types?.[node._type] as Type<unknown>;

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

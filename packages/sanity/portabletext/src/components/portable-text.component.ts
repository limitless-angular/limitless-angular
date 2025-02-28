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
  componentOverrides = input<Partial<PortableTextComponents>>(
    {},
    // eslint-disable-next-line @angular-eslint/no-input-rename
    { alias: 'components' },
  );

  renderNode =
    viewChild.required<TemplateRef<RenderNodeContext<B>>>('renderNode');

  unknownBlockTmpl =
    viewChild.required<TemplateRef<{ $implicit: TypedObject }>>('unknownBlock');

  onMissingComponent = input<MissingComponentHandler | false>(printWarning);

  #vcr = inject(ViewContainerRef);

  #injector = inject(Injector);

  components = computed(() =>
    mergeComponents(defaultComponents, this.componentOverrides()),
  );

  blockTemplate = computed(() =>
    this.#vcr
      .createComponent(BlockComponent, { injector: this.#injector })
      .instance.template(),
  );
  listTemplate = computed(() =>
    this.#vcr
      .createComponent(ListComponent, { injector: this.#injector })
      .instance.template(),
  );
  listItemTemplate = computed(() =>
    this.#vcr
      .createComponent(ListItemComponent, { injector: this.#injector })
      .instance.template(),
  );
  spanTemplate = computed(() =>
    this.#vcr
      .createComponent(SpanComponent, { injector: this.#injector })
      .instance.template(),
  );
  textTemplate = computed(() =>
    this.#vcr
      .createComponent(TextComponent, { injector: this.#injector })
      .instance.template(),
  );

  nestedBlocks = computed(() => {
    const blocks = Array.isArray(this.value()) ? this.value() : [this.value()];
    return nestLists(blocks as TypedObject[], LIST_NEST_MODE_HTML);
  });

  hasCustomComponentForNode = (node: TypedObject): boolean =>
    node._type in this.components().types;

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

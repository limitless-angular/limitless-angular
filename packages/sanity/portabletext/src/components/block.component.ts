import {
  ChangeDetectionStrategy,
  Component,
  inject,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { PortableTextBlock } from '@portabletext/types';
import { memoize } from 'lodash-es';
import { Serializable, TemplateContext } from '../types';
import { serializeBlock } from '../utils';
import { PortableTextComponent } from './portable-text.component';
import { MISSING_COMPONENT_HANDLER } from '../tokens';
import { unknownBlockStyleWarning } from '../warnings';

@Component({
  selector: 'lib-block',
  imports: [NgComponentOutlet],
  template: `
    <ng-template #blockTmpl let-node let-index="index" let-isInline="isInline"
      ><ng-container
        *ngComponentOutlet="
          getBlockComponent(node);
          inputs: {
            children: getChildren({ node, isInline, index }),
            value: node,
            isInline,
          }
        "
    /></ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class BlockComponent {
  template =
    viewChild.required<TemplateRef<TemplateContext<PortableTextBlock>>>(
      'blockTmpl',
    );
  components = inject(PortableTextComponent).components;
  #missingHandler = inject(MISSING_COMPONENT_HANDLER);

  getBlockComponent = (node: PortableTextBlock) => {
    const style = node.style ?? 'normal';
    const Block =
      this.components().block?.[style] ?? this.components().unknownBlockStyle;
    if (Block === this.components().unknownBlockStyle) {
      this.#missingHandler(unknownBlockStyleWarning(style), {
        nodeType: 'blockStyle',
        type: style,
      });
    }

    return Block;
  };

  getChildren: (options: Serializable<PortableTextBlock>) => unknown[] =
    memoize((options) => serializeBlock(options).children);
}

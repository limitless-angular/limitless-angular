import {
  ChangeDetectionStrategy,
  Component,
  inject,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import { PortableTextBlock } from '@portabletext/types';
import { memoize } from 'lodash-es';
import { Serializable, TemplateContext } from '../types';
import { serializeBlock, trackBy } from '../utils';
import { PortableTextComponent } from './portable-text.component';
import { RenderNode } from '../directives/render-node.directive';

@Component({
  selector: 'lib-block',
  imports: [NgTemplateOutlet, NgComponentOutlet, RenderNode],
  template: `
    <ng-template #blockTmpl let-node let-index="index" let-isInline="isInline">
      @if (components().block?.[node.style ?? 'normal']; as BlockComponent) {
        <ng-container
          *ngComponentOutlet="
            BlockComponent;
            inputs: {
              template: children,
              context: {
                children: getChildren({ node, isInline, index }),
              },
              value: node,
              isInline,
            }
          "
        />
      } @else {
        <!-- TODO: remove class when warning msg be implemented -->
        <p [class]="'unknown__pt__block__' + node.style">
          <ng-container
            *ngTemplateOutlet="
              children;
              context: {
                children: getChildren({ node, isInline, index }),
              }
            "
          />
        </p>
      }
    </ng-template>

    <ng-template #children let-children="children">
      @for (
        child of children;
        track trackBy(child._key, $index);
        let i = $index
      ) {
        <ng-container [renderNode]="child" [isInline]="true" [index]="i" />
      }
    </ng-template>
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

  getChildren: (options: Serializable<PortableTextBlock>) => unknown[] =
    memoize((options) => serializeBlock(options).children);

  protected readonly trackBy = trackBy;
}

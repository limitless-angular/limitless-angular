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
import { TemplateContext } from '../types';
import { serializeBlock } from '../utils';
import { PortableTextComponent } from './portable-text.component';
import { RenderNodeDirective } from '../directives/render-node.directive';

@Component({
  selector: 'lib-block',
  imports: [NgTemplateOutlet, NgComponentOutlet, RenderNodeDirective],
  template: `
    <ng-template #blockTmpl let-node let-isInline="isInline">
      @if (components().block?.[node.style ?? 'normal']; as BlockComponent) {
        <ng-container
          *ngComponentOutlet="
            BlockComponent;
            inputs: {
              template: blockChildren,
              context: { node, isInline },
              value: node,
              isInline,
            }
          "
        />
      } @else {
        <!-- TODO: remove class when warning msg be implemented -->
        <p [class]="'unknown__pt__block__' + node.style">
          <ng-container
            *ngTemplateOutlet="blockChildren; context: { node, isInline }"
          />
        </p>
      }
    </ng-template>

    <ng-template #blockChildren let-node="node" let-isInline="isInline">
      @for (
        child of serializeBlock({ node, isInline: false }).children;
        track child._key;
        let idx = $index
      ) {
        <ng-container [renderNode]="child" [isInline]="true" [index]="idx" />
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
  protected readonly serializeBlock = serializeBlock;
}

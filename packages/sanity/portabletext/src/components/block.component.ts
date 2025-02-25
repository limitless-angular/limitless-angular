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

@Component({
  selector: 'lib-block',
  imports: [NgTemplateOutlet, NgComponentOutlet],
  template: `
    <ng-template #blockTmpl let-node let-isInline="isInline">
      <ng-template #children>
        <ng-container
          *ngTemplateOutlet="blockChildren; context: { node, isInline }"
        />
      </ng-template>

      @if (components().block?.[node.style ?? 'normal']) {
        <ng-container
          *ngComponentOutlet="
            components().block?.[node.style ?? 'normal']!;
            inputs: {
              childrenData: {
                template: blockChildren,
                context: { node, isInline },
              },
              value: node,
              isInline,
            }
          "
        />
      } @else {
        @switch (node.style ?? 'normal') {
          @case ('normal') {
            <p>
              <ng-container *ngTemplateOutlet="children" />
            </p>
          }
          @case ('h1') {
            <h1>
              <ng-container *ngTemplateOutlet="children" />
            </h1>
          }
          @case ('h2') {
            <h2>
              <ng-container *ngTemplateOutlet="children" />
            </h2>
          }
          @case ('h3') {
            <h3>
              <ng-container *ngTemplateOutlet="children" />
            </h3>
          }
          @case ('h4') {
            <h4>
              <ng-container *ngTemplateOutlet="children" />
            </h4>
          }
          @case ('h5') {
            <h5>
              <ng-container *ngTemplateOutlet="children" />
            </h5>
          }
          @case ('h6') {
            <h6>
              <ng-container *ngTemplateOutlet="children" />
            </h6>
          }
          @case ('blockquote') {
            <blockquote>
              <ng-container *ngTemplateOutlet="children" />
            </blockquote>
          }
          @default {
            <!-- TODO: remove class when warning msg be implemented -->
            <p [class]="'unknown__pt__block__' + node.style">
              <ng-container *ngTemplateOutlet="children" />
            </p>
          }
        }
      }
    </ng-template>

    <ng-template #blockChildren let-node="node" let-isInline="isInline">
      @for (
        child of serializeBlock({ node, isInline: false }).children;
        track child._key;
        let childIndex = $index
      ) {
        <ng-container
          *ngTemplateOutlet="
            renderNode();
            context: { $implicit: child, index: childIndex, isInline: true }
          "
        />
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
  renderNode = inject(PortableTextComponent).renderNode;
  protected readonly serializeBlock = serializeBlock;
}

import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import { PortableTextBlock, TypedObject } from '@portabletext/types';
import { TemplateContext } from '../types';
import { serializeBlock } from '../utils';

@Component({
  selector: 'lib-block',
  standalone: true,
  imports: [NgTemplateOutlet, NgComponentOutlet],
  template: `
    <ng-template
      #blockTmpl
      let-node
      let-isInline="isInline"
      let-components="components"
      let-renderNode="renderNode"
    >
      <ng-template #children>
        <ng-container
          *ngTemplateOutlet="
            blockChildren;
            context: { node, isInline, components, renderNode }
          "
        />
      </ng-template>

      @let style = node.style ?? 'normal';
      @if (components.block?.[style]) {
        <ng-container
          *ngComponentOutlet="
            components.block?.[style];
            inputs: {
              childrenData: {
                template: blockChildren,
                context: { node, isInline, components, renderNode },
              },
              value: node,
              isInline,
            }
          "
        />
      } @else {
        @switch (style) {
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
            <div>Unknown block style: {{ node.style }}</div>
          }
        }
      }
    </ng-template>

    <ng-template
      #blockChildren
      let-node="node"
      let-isInline="isInline"
      let-components="components"
      let-renderNode="renderNode"
    >
      @for (
        child of serializeBlock({ node, isInline: false }).children;
        track child._key;
        let childIndex = $index
      ) {
        <ng-container
          *ngTemplateOutlet="
            renderNode;
            context: {
              $implicit: child,
              index: childIndex,
              isInline: true,
              components,
            }
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
  protected readonly serializeBlock = serializeBlock;
}

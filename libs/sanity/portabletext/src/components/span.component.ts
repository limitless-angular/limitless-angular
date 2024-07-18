import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';

import {
  spanToPlainText,
  ToolkitNestedPortableTextSpan,
} from '@portabletext/toolkit';

import { TemplateContext } from '../types';

@Component({
  selector: 'lib-span',
  standalone: true,
  imports: [NgTemplateOutlet, NgComponentOutlet],
  template: `
    <ng-template
      #spanTmpl
      let-node
      let-components="components"
      let-renderNode="renderNode"
    >
      <ng-template #children>
        <ng-container
          *ngTemplateOutlet="
            nodeChildren;
            context: { $implicit: node, components, renderNode }
          "
        />
      </ng-template>

      @if (components.marks?.[node.markType]) {
        <ng-container
          *ngComponentOutlet="
            components.marks?.[node.markType];
            inputs: {
              childrenData: {
                template: nodeChildren,
                context: { $implicit: node, components, renderNode },
              },
              text: spanToPlainText(node),
              value: node.markDef,
              markType: node.markType,
            }
          "
        />
      } @else {
        @switch (node.markType) {
          @case ('strong') {
            <strong><ng-container *ngTemplateOutlet="children" /></strong>
          }
          @case ('em') {
            <em><ng-container *ngTemplateOutlet="children" /></em>
          }
          @case ('code') {
            <code><ng-container *ngTemplateOutlet="children" /></code>
          }
          @case ('underline') {
            <u><ng-container *ngTemplateOutlet="children" /></u>
          }
          @case ('strike-through') {
            <s><ng-container *ngTemplateOutlet="children" /></s>
          }
          @case ('link') {
            <a [href]="node.markDef?.href"
              ><ng-container *ngTemplateOutlet="children"
            /></a>
          }
          @default {
            <span [class]="'unknown__pt__mark__' + node.markType"
              ><ng-container *ngTemplateOutlet="children"
            /></span>
          }
        }
      }
    </ng-template>

    <ng-template
      #nodeChildren
      let-node
      let-components="components"
      let-renderNode="renderNode"
    >
      @if (!node.children) {
        <ng-container
          *ngTemplateOutlet="
            renderNode;
            context: { $implicit: node, isInline: true, components }
          "
        />
      } @else {
        @for (child of node.children; track child._key; let index = $index) {
          <ng-container
            *ngTemplateOutlet="
              renderNode;
              context: { $implicit: child, isInline: true, components }
            "
          />
        }
      }
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class SpanComponent {
  template =
    viewChild.required<
      TemplateRef<TemplateContext<ToolkitNestedPortableTextSpan>>
    >('spanTmpl');
  protected readonly spanToPlainText = spanToPlainText;
}

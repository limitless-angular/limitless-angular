import {
  ChangeDetectionStrategy,
  Component,
  inject,
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
import { trackBy } from '../utils';
import { MISSING_COMPONENT_HANDLER } from '../tokens';
import { unknownMarkWarning } from '../warnings';
import { PortableTextComponent } from './portable-text.component';
import { RenderNodeDirective } from '../directives/render-node.directive';

@Component({
  selector: 'lib-span',
  imports: [NgTemplateOutlet, NgComponentOutlet, RenderNodeDirective],
  template: `
    <ng-template #spanTmpl let-node>
      <ng-template #children>
        <ng-container
          *ngTemplateOutlet="nodeChildren; context: { $implicit: node }"
        />
      </ng-template>

      @if (components().marks?.[node.markType]) {
        <ng-container
          *ngComponentOutlet="
            components().marks?.[node.markType]!;
            inputs: {
              childrenData: {
                template: nodeChildren,
                context: { $implicit: node },
              },
              text: spanToPlainText(node),
              value: node.markDef,
              markKey: node.markKey,
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
            <span style="text-decoration: underline"
              ><ng-container *ngTemplateOutlet="children"
            /></span>
          }
          @case ('strike-through') {
            <del><ng-container *ngTemplateOutlet="children" /></del>
          }
          @case ('link') {
            <a [href]="node.markDef?.href"
              ><ng-container *ngTemplateOutlet="children"
            /></a>
          }
          @default {
            {{ handleMissingComponent(node.markType)
            }}<span [class]="'unknown__pt__mark__' + node.markType"
              ><ng-container *ngTemplateOutlet="children"
            /></span>
          }
        }
      }
    </ng-template>

    <ng-template #nodeChildren let-node>
      @if (!node.children) {
        <ng-container [renderNode]="node" [isInline]="true" />
      } @else {
        @for (
          child of node.children;
          track trackBy(child._key, index);
          let index = $index
        ) {
          <ng-container [renderNode]="child" [isInline]="true" />
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
  components = inject(PortableTextComponent).components;

  #missingHandler = inject(MISSING_COMPONENT_HANDLER);

  handleMissingComponent(markType: string) {
    this.#missingHandler(unknownMarkWarning(markType), {
      type: markType,
      nodeType: 'mark',
    });
  }

  protected readonly spanToPlainText = spanToPlainText;
  protected readonly trackBy = trackBy;
}

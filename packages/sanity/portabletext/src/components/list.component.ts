import {
  ChangeDetectionStrategy,
  Component,
  inject,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';

import { MISSING_COMPONENT_HANDLER } from '../tokens';
import { TemplateContext, PortableTextListBlock } from '../types';
import { trackBy } from '../utils';
import { unknownListStyleWarning } from '../warnings';
import { PortableTextComponent } from './portable-text.component';
import { RenderNodeDirective } from '../directives/render-node.directive';

@Component({
  selector: 'lib-list',
  imports: [NgTemplateOutlet, NgComponentOutlet, RenderNodeDirective],
  template: `
    <ng-template #listTmpl let-node>
      @if (components().list?.[node.listItem]; as ListItem) {
        <ng-container
          *ngComponentOutlet="
            ListItem;
            inputs: {
              template: listChildren,
              context: { node },
              value: node,
              isInline: false,
            }
          "
        />
      } @else {
        <ul>
          <ng-container *ngTemplateOutlet="listChildren; context: { node }" />{{
            handleMissingComponent(node)
          }}
        </ul>
      }
    </ng-template>

    <ng-template #listChildren let-node="node">
      @for (
        child of node.children;
        track trackBy(child._key, index, 'li');
        let index = $index
      ) {
        <ng-container
          [renderNode]="getChildNode(child, index)"
          [isInline]="false"
          [index]="index"
        />
      }
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ListComponent {
  template =
    viewChild.required<TemplateRef<TemplateContext<PortableTextListBlock>>>(
      'listTmpl',
    );
  components = inject(PortableTextComponent).components;

  missingHandler = inject(MISSING_COMPONENT_HANDLER);

  handleMissingComponent(node: PortableTextListBlock) {
    const style = node.listItem || 'bullet';
    this.missingHandler(unknownListStyleWarning(style), {
      nodeType: 'listStyle',
      type: style,
    });
  }

  protected getChildNode(
    child: PortableTextListBlock['children'][0],
    index: number,
  ) {
    return child._key ? child : { ...child, _key: `li-${index}` };
  }

  protected readonly trackBy = trackBy;
}

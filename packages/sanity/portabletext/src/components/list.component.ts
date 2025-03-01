import {
  ChangeDetectionStrategy,
  Component,
  inject,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';

import { MISSING_COMPONENT_HANDLER } from '../tokens';
import { TemplateContext, PortableTextListBlock } from '../types';
import { unknownListStyleWarning } from '../warnings';
import { PortableTextComponent } from './portable-text.component';

@Component({
  selector: 'lib-list',
  imports: [NgComponentOutlet],
  template: `
    <ng-template #listTmpl let-node
      ><ng-container
        *ngComponentOutlet="
          getListComponent(node);
          inputs: {
            children: node.children,
            value: node,
            isInline: false,
          }
        "
    /></ng-template>
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

  getListComponent = (node: PortableTextListBlock) => {
    const List =
      this.components().list?.[node.listItem] ?? this.components().unknownList;
    if (List === this.components().unknownList) {
      const style = node.listItem || 'bullet';
      this.missingHandler(unknownListStyleWarning(style), {
        nodeType: 'listStyle',
        type: style,
      });
    }

    return List;
  };

  handleMissingComponent(node: PortableTextListBlock) {
    const style = node.listItem || 'bullet';
    this.missingHandler(unknownListStyleWarning(style), {
      nodeType: 'listStyle',
      type: style,
    });
  }
}

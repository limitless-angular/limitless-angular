import { Component, TemplateRef, viewChild } from '@angular/core';
import { TypedObject } from '@portabletext/types';
import { trackBy } from '../utils';
import { RenderNode } from '../directives/render-node.directive';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'pt-children',
  imports: [RenderNode],
  template: `<ng-template let-children="children">
    @for (
      child of children;
      track trackBy(child._key, $index);
      let index = $index
    ) {
      <ng-container
        [renderNode]="child"
        [isInline]="child.isInline ?? true"
        [index]="index"
      />
    }
  </ng-template>`,
})
export class ChildrenComponent {
  template =
    viewChild.required<
      TemplateRef<{ children: (TypedObject & { isInline?: boolean })[] }>
    >(TemplateRef);
  protected readonly trackBy = trackBy;
}

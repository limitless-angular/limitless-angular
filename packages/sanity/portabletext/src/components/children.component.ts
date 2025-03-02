import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { TypedObject } from '@portabletext/types';
import { trackBy } from '../utils';
import { RenderNode } from '../directives/render-node.directive';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'pt-children',
  imports: [RenderNode],
  template: `<ng-template let-children="children" let-isInline="isInline">
    @for (
      child of children;
      track trackBy(child._key, $index);
      let index = $index
    ) {
      <ng-container
        [renderNode]="child"
        [isInline]="child.isInline ?? isInline ?? true"
        [index]="index"
      />
    }
  </ng-template>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ChildrenComponent {
  template = viewChild.required<
    TemplateRef<{
      children: (TypedObject & { isInline?: boolean })[];
      isInline?: boolean;
    }>
  >(TemplateRef);
  protected readonly trackBy = trackBy;
}

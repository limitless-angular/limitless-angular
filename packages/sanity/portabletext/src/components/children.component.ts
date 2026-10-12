import {
  ChangeDetectionStrategy,
  Component,
  inject,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TypedObject } from '@portabletext/types';
import { trackBy } from '../utils';
import { PORTABLE_TEXT_RENDERER_CONTEXT } from '../tokens';

@Component({
  imports: [NgTemplateOutlet],
  template: `<ng-template let-children="children" let-isInline="isInline">
    @for (
      child of children;
      track trackBy(child._key, $index);
      let index = $index
    ) {
      <ng-container
        [ngTemplateOutlet]="renderNode()"
        [ngTemplateOutletContext]="{
          $implicit: child,
          isInline: child.isInline ?? isInline ?? true,
          index: child.index ?? index,
        }"
      />
    }
  </ng-template>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ChildrenComponent {
  template = viewChild.required<
    TemplateRef<{
      children: (TypedObject & { index?: number; isInline?: boolean })[];
      isInline?: boolean;
    }>
  >(TemplateRef);
  protected readonly renderNode = inject(PORTABLE_TEXT_RENDERER_CONTEXT)
    .renderNode;
  protected readonly trackBy = trackBy;
}

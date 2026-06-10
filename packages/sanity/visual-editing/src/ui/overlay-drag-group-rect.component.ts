import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import type { OverlayRect } from '../types';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'sanity-visual-editing-drag-group-rect',
  standalone: true,
  template: '<div class="group-rect" [style]="style()"></div>',
  styles: `
    .group-rect {
      border: 1px dashed #f0709b;
      pointer-events: none;
      position: absolute;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverlayDragGroupRectComponent {
  dragGroupRect = input.required<OverlayRect>();

  protected style = computed(() => {
    const rect = this.dragGroupRect();
    return {
      height: `${rect.h - 1}px`,
      left: `${rect.x}px`,
      top: `${rect.y}px`,
      width: `${rect.w - 1}px`,
    };
  });
}

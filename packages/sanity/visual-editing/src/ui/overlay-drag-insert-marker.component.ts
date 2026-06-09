import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import type { DragInsertPosition } from '../types';

const DRAG_INSERT_MARKER_THICKNESS = 6;

function lerp(v0: number, v1: number, t: number): number {
  return v0 * (1 - t) + v1 * t;
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'sanity-visual-editing-drag-insert-marker',
  standalone: true,
  template: '<div class="marker" [style]="style()"></div>',
  styles: `
    .marker {
      background: #556bfc;
      border: 2px solid white;
      border-radius: 999px;
      position: absolute;
      z-index: 999999;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverlayDragInsertMarkerComponent {
  dragInsertPosition = input.required<NonNullable<DragInsertPosition>>();

  protected style = computed(() => {
    const dragInsertPosition = this.dragInsertPosition();
    const flow =
      dragInsertPosition.left || dragInsertPosition.right
        ? 'horizontal'
        : 'vertical';

    let x = 0;
    let y = 0;
    let width = 0;
    let height = 0;
    const offsetMultiplier = 0.0125;

    if (flow === 'horizontal') {
      const { left, right } = dragInsertPosition;
      width = DRAG_INSERT_MARKER_THICKNESS;

      if (right && left) {
        const startX = left.rect.x + left.rect.w;
        const endX = right.rect.x;
        const targetHeight = Math.min(right.rect.h, left.rect.h);
        const offset = targetHeight * offsetMultiplier;

        x = lerp(startX, endX, 0.5) - DRAG_INSERT_MARKER_THICKNESS / 2;
        y = left.rect.y + offset;
        height = Math.min(right.rect.h, left.rect.h) - offset * 2;
      } else if (right && !left) {
        const targetHeight = right.rect.h;
        const offset = targetHeight * offsetMultiplier;

        x = right.rect.x - DRAG_INSERT_MARKER_THICKNESS / 2;
        y = right.rect.y + offset;
        height = right.rect.h - offset * 2;
      } else if (left && !right) {
        const targetHeight = left.rect.h;
        const offset = targetHeight * offsetMultiplier;

        x = left.rect.x + left.rect.w - DRAG_INSERT_MARKER_THICKNESS / 2;
        y = left.rect.y + offset;
        height = left.rect.h - offset * 2;
      }
    } else {
      const { bottom, top } = dragInsertPosition;

      if (bottom && top) {
        const startX = Math.min(top.rect.x, bottom.rect.x);
        const startY = top.rect.y + top.rect.h;
        const endY = bottom.rect.y;
        const targetWidth = Math.min(bottom.rect.w, top.rect.w);
        const offset = targetWidth * offsetMultiplier;

        height = DRAG_INSERT_MARKER_THICKNESS;
        x = startX + offset;
        y = lerp(startY, endY, 0.5) - DRAG_INSERT_MARKER_THICKNESS / 2;
        width = Math.max(bottom.rect.w, top.rect.w) - offset * 2;
      } else if (bottom && !top) {
        const targetWidth = bottom.rect.w;
        const offset = targetWidth * offsetMultiplier;

        x = bottom.rect.x + offset;
        y = bottom.rect.y - DRAG_INSERT_MARKER_THICKNESS / 2;
        width = bottom.rect.w - offset * 2;
        height = DRAG_INSERT_MARKER_THICKNESS;
      } else if (top && !bottom) {
        const targetWidth = top.rect.w;
        const offset = targetWidth * offsetMultiplier;

        x = top.rect.x + offset;
        y = top.rect.y + top.rect.h - DRAG_INSERT_MARKER_THICKNESS / 2;
        width = top.rect.w - offset * 2;
        height = DRAG_INSERT_MARKER_THICKNESS;
      }
    }

    return {
      height: `${height}px`,
      transform: `translate(${x}px, ${y}px)`,
      width: `${width}px`,
    };
  });
}

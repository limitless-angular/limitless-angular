import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import type { DragSkeleton } from '../types';

function clamp(number: number, min: number, max: number): number {
  return number < min ? min : number > max ? max : number;
}

function mapRange(
  number: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  const mapped =
    ((number - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;

  return clamp(mapped, outMin, outMax);
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'sanity-visual-editing-drag-preview',
  template: `
    <div class="preview" [style]="previewStyle()">
      <div class="card" [style.borderRadius.px]="radius()">
        <svg [attr.viewBox]="viewBox()">
          @for (rect of childRects(); track $index) {
            <rect
              [attr.x]="rect.x"
              [attr.y]="rect.y"
              [attr.width]="rect.w"
              [attr.height]="rect.h"
              fill="#e5e7eb"
            />
          }
        </svg>
      </div>
    </div>
  `,
  styles: `
    .preview {
      cursor: move;
      display: grid;
      opacity: 0.98;
      position: fixed;
      z-index: 9999999;
    }

    .card {
      background: #fff;
      box-shadow:
        0 16px 48px rgba(31, 41, 55, 0.24),
        0 2px 8px rgba(31, 41, 55, 0.12);
      height: 100%;
      overflow: hidden;
      position: relative;
      width: 100%;
    }

    svg {
      inset: 0;
      position: absolute;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverlayDragPreviewComponent {
  skeleton = input.required<DragSkeleton>();

  protected childRects = computed(() => {
    const rects = this.skeleton().childRects;
    const imageRects = rects.filter((rect) => rect.tagName === 'IMG');
    const textRects = rects.filter((rect) => rect.tagName !== 'IMG');

    return [...imageRects, ...textRects];
  });

  protected radius = computed(() =>
    Math.round(mapRange(this.skeleton().w, 0, 1920, 3, 12)),
  );

  protected previewStyle = computed(() => {
    const skeleton = this.skeleton();
    const maxSkeletonWidth = Math.min(skeleton.maxWidth, window.innerWidth / 2);
    const scaleFactor =
      skeleton.w > maxSkeletonWidth ? maxSkeletonWidth / skeleton.w : 1;

    return {
      height: `${skeleton.h}px`,
      transform: `translate(calc(var(--drag-preview-x) - ${skeleton.w / 2}px), calc(var(--drag-preview-y) - ${skeleton.h / 2}px)) scale(${scaleFactor})`,
      width: `${skeleton.w}px`,
    };
  });

  protected viewBox = computed(() => {
    const skeleton = this.skeleton();
    return `0 0 ${skeleton.w} ${skeleton.h}`;
  });
}

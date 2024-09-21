import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  effect,
} from '@angular/core';

import { injectDisableDraftMode } from './actions';

@Component({
  selector: 'blog-alert-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (shouldShow()) {
      <div
        [class.animate-pulse]="pending()"
        class="fixed top-0 left-0 z-50 w-full border-b bg-white/95 text-black backdrop-blur"
      >
        <div class="py-2 text-center text-sm">
          @if (pending()) {
            Disabling draft mode...
          } @else {
            Previewing drafts.
            <button
              type="button"
              (click)="disableDraft()"
              class="hover:text-cyan underline transition-colors duration-200"
            >
              Back to published
            </button>
          }
        </div>
      </div>
    }
  `,
})
export class AlertBannerComponent {
  private disableDraftMode = injectDisableDraftMode();

  pending = signal(false);

  shouldShow = computed(() => {
    if (typeof window !== 'undefined') {
      return window.top === window;
    }
    return false;
  });

  constructor() {
    effect(() => {
      // This effect is empty because we don't need to do anything when shouldShow changes
      // It's here to demonstrate how we could react to changes if needed
      const show = this.shouldShow();
      console.log('Should show alert:', show);
    });
  }

  disableDraft() {
    this.pending.set(true);
    this.disableDraftMode().then(() => {
      this.pending.set(false);
    });
  }
}

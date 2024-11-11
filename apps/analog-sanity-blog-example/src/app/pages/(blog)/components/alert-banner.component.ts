import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  effect,
} from '@angular/core';

@Component({
  selector: 'blog-alert-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (shouldShow()) {
      <div
        class="fixed top-0 left-0 z-50 w-full border-b bg-white/95 text-black backdrop-blur"
      >
        <div class="py-2 text-center text-sm">
          Previewing drafts.
          <a
            href="/api/draft/disable"
            class="hover:text-cyan underline transition-colors duration-200"
          >
            Back to published
          </a>
        </div>
      </div>
    }
  `,
})
export class AlertBannerComponent {
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
}

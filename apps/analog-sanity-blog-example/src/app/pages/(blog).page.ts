import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';

import { VisualEditingComponent } from '@limitless-angular/sanity/visual-editing';
import { LiveQueryProviderComponent } from '@limitless-angular/sanity/preview-kit';

import { AlertBannerComponent } from './(blog)/components/alert-banner.component';
import { injectChildrenLoad } from '../utils/inject-children-load';

interface BlogPageProps {
  draftMode: boolean;
  token: string;
  [key: string]: any;
}

@Component({
  standalone: true,
  imports: [
    RouterOutlet,
    AlertBannerComponent,
    VisualEditingComponent,
    LiveQueryProviderComponent,
  ],
  template: `
    <div class="min-h-screen">
      @if (draftMode()) {
        <app-alert-banner />
      }
      <main>
        @if (draftMode()) {
          <live-query-provider [token]="token()">
            <router-outlet />
          </live-query-provider>
        } @else {
          <router-outlet />
        }
      </main>
    </div>
    @if (draftMode()) {
      <visual-editing />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class BlogPage {
  data = toSignal(injectChildrenLoad<BlogPageProps>(), { requireSync: true });
  draftMode = computed(() => this.data().draftMode);
  token = computed(() => this.data().token);
}

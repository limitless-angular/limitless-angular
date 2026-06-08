import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
} from '@angular/core';
import type { ClientPerspective } from '@sanity/client';

import { LivePreviewService } from './live-preview.service';
import { PerspectiveService } from './perspective.service';
import { RevalidateService } from './revalidate.service';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'live-query-provider',
  template: `<ng-content />`,
  providers: [LivePreviewService, PerspectiveService, RevalidateService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveQueryProviderComponent {
  token = input.required<string>();
  perspective = input<Exclude<ClientPerspective, 'raw'>>('drafts');

  private livePreviewService = inject(LivePreviewService);

  constructor() {
    // Initialization for Angular v18
    afterNextRender(() => {
      if (!this.livePreviewService.isInitialized) {
        this.initializeLivePreview(this.token(), this.perspective());
      }
    });

    // Initialization for Angular v19
    effect(() => {
      const token = this.token();
      const perspective = this.perspective();

      if (!this.livePreviewService.isInitialized) {
        this.initializeLivePreview(token, perspective);
        return;
      }

      this.livePreviewService.setPerspective(perspective);
    });
  }

  private initializeLivePreview(
    token: string,
    perspective: Exclude<ClientPerspective, 'raw'>,
  ): void {
    this.livePreviewService.setPerspective(perspective);
    this.livePreviewService.initialize(token);
  }
}

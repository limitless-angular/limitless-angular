import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
} from '@angular/core';

import { LiveEventsService } from './live-query-provider/live-events.service';
import { LiveQueriesService } from './live-query-provider/live-queries.service';
import { ShouldPauseService } from './live-query-provider/should-pause.service';
import { LivePreviewService } from './live-preview.service';
import { PerspectiveService } from './perspective.service';
import type { LivePreviewPerspective, Logger } from './types';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'live-query-provider',
  template: `<ng-content />`,
  providers: [
    LivePreviewService,
    PerspectiveService,
    LiveEventsService,
    LiveQueriesService,
    ShouldPauseService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveQueryProviderComponent {
  token = input<string | undefined>();
  logger = input<Logger | undefined>();
  perspective = input<LivePreviewPerspective>('drafts');

  private livePreviewService = inject(LivePreviewService);

  constructor() {
    // Initialization for Angular v18
    afterNextRender(() => {
      if (!this.livePreviewService.isInitialized) {
        this.initializeLivePreview(
          this.token(),
          this.perspective(),
          this.logger(),
        );
      }
    });

    // Initialization for Angular v19
    effect(() => {
      const token = this.token();
      const logger = this.logger();
      const perspective = this.perspective();

      if (!this.livePreviewService.isInitialized) {
        this.initializeLivePreview(token, perspective, logger);
        return;
      }

      this.livePreviewService.setPerspective(perspective);
    });
  }

  private initializeLivePreview(
    token: string | undefined,
    perspective: LivePreviewPerspective,
    logger: Logger | undefined,
  ): void {
    this.livePreviewService.setPerspective(perspective);
    this.livePreviewService.initialize(token);
    logger?.log(
      '[@sanity/preview-kit]: Updates will be applied in real-time using the Sanity Live Content API.',
    );
  }
}

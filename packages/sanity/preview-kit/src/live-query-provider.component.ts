import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { UseDocumentsInUseService } from '@repo/preview-kit-compat';

import { LivePreviewService } from './live-preview.service';
import { RevalidateService } from './revalidate.service';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'live-query-provider',
  standalone: true,
  template: `<ng-content />`,
  providers: [LivePreviewService, RevalidateService, UseDocumentsInUseService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveQueryProviderComponent {
  token = input.required<string>();

  private livePreviewService = inject(LivePreviewService);

  constructor() {
    afterNextRender(() => {
      this.livePreviewService.initialize(this.token());
    });
  }
}

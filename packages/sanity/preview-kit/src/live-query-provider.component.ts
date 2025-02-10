import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
} from '@angular/core';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { UseDocumentsInUseService } from '@limitless-angular/sanity/preview-kit-compat';

import { LivePreviewService } from './live-preview.service';
import { RevalidateService } from './revalidate.service';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'live-query-provider',
  template: `<ng-content />`,
  providers: [LivePreviewService, RevalidateService, UseDocumentsInUseService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveQueryProviderComponent {
  token = input.required<string>();

  private livePreviewService = inject(LivePreviewService);

  constructor() {
    effect(() => {
      this.livePreviewService.initialize(this.token());
    });
  }
}

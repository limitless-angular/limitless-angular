import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type {
  HistoryAdapter,
  VisualEditingOptions,
} from '@sanity/visual-editing';

import { injectChannel } from './injectChannel';
import { OverlaysComponent } from './overlays.component';
import { MetaComponent } from './meta.component';
import { RefreshComponent } from './refresh.component';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'visual-editing',
  standalone: true,
  template: `
    <lib-overlays
      [channel]="channel"
      [history]="history()"
      [zIndex]="zIndex()"
    />
    <lib-meta [channel]="channel" />
    @if (refresh(); as refresh) {
      <lib-refresh [channel]="channel" [refresh]="refresh" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OverlaysComponent, MetaComponent, RefreshComponent],
})
export class VisualEditingComponent {
  history = input<HistoryAdapter>();

  refresh = input<VisualEditingOptions['refresh']>();

  zIndex = input<VisualEditingOptions['zIndex']>();

  channel = injectChannel();
}

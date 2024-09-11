import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
} from '@angular/core';

import { VisualEditingChannel } from '../types';
import type { VisualEditingOptions } from '@sanity/visual-editing';

@Component({
  selector: 'lib-refresh',
  standalone: true,
  template: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RefreshComponent {
  channel = input.required<VisualEditingChannel>();

  refresh = input.required<Required<VisualEditingOptions>['refresh']>();

  constructor() {
    let manualRefreshRef: number | undefined;
    let mutationRefreshRef: number | undefined;

    effect(() => {
      const channel = this.channel();
      const refresh = this.refresh();

      return channel.subscribe((type, data) => {
        if (type === 'presentation/refresh' && data.source === 'manual') {
          clearTimeout(manualRefreshRef);
          const promise = refresh(data);
          if (promise === false) return;
          channel.send('visual-editing/refreshing', data);
          let timedOut = false;
          manualRefreshRef = window.setTimeout(() => {
            channel.send('visual-editing/refreshed', data);
            timedOut = true;
          }, 3000);
          promise?.finally?.(() => {
            if (timedOut) return;
            clearTimeout(manualRefreshRef);
            channel.send('visual-editing/refreshed', data);
          });
        } else if (
          type === 'presentation/refresh' &&
          data.source === 'mutation'
        ) {
          clearTimeout(mutationRefreshRef);
          const promise = refresh(data);
          if (promise === false) return;
          channel.send('visual-editing/refreshing', data);
          // Send an additional refresh to account for Content Lake eventual consistency
          mutationRefreshRef = window.setTimeout(() => {
            const promise = refresh(data);
            if (promise === false) return;
            channel.send('visual-editing/refreshing', data);
            promise?.finally?.(() => {
              channel.send('visual-editing/refreshed', data);
            }) || channel.send('visual-editing/refreshed', data);
          }, 1000);
          promise?.finally?.(() => {
            channel.send('visual-editing/refreshed', data);
          }) || channel.send('visual-editing/refreshed', data);
        }
      });
    });
  }
}

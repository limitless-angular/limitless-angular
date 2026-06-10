import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
} from '@angular/core';

import type { VisualEditingNode, VisualEditingOptions } from '../types';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'sanity-visual-editing-refresh',
  standalone: true,
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RefreshComponent {
  comlink = input.required<VisualEditingNode>();
  refresh = input.required<Required<VisualEditingOptions>['refresh']>();

  constructor() {
    effect((onCleanup) => {
      const comlink = this.comlink();
      const refresh = this.refresh();
      let manualRefreshTimer = 0;
      let mutationRefreshTimer = 0;

      const unsubscribe = comlink.on('presentation/refresh', (data) => {
        if (data.source === 'manual') {
          window.clearTimeout(manualRefreshTimer);
          const promise = refresh(data);
          if (promise === false) {
            return;
          }
          comlink.post('visual-editing/refreshing', data);
          let timedOut = false;
          manualRefreshTimer = window.setTimeout(() => {
            comlink.post('visual-editing/refreshed', data);
            timedOut = true;
          }, 3000);
          promise?.finally?.(() => {
            if (timedOut) {
              return;
            }
            window.clearTimeout(manualRefreshTimer);
            comlink.post('visual-editing/refreshed', data);
          });
          return;
        }

        if (data.source === 'mutation') {
          window.clearTimeout(mutationRefreshTimer);
          const promise = refresh(data);
          if (promise === false) {
            return;
          }
          comlink.post('visual-editing/refreshing', data);
          mutationRefreshTimer = window.setTimeout(() => {
            const retryPromise = refresh(data);
            if (retryPromise === false) {
              return;
            }
            comlink.post('visual-editing/refreshing', data);
            if (retryPromise) {
              retryPromise.finally(() => {
                comlink.post('visual-editing/refreshed', data);
              });
            } else {
              comlink.post('visual-editing/refreshed', data);
            }
          }, 1000);
          if (promise) {
            promise.finally(() => {
              comlink.post('visual-editing/refreshed', data);
            });
          } else {
            comlink.post('visual-editing/refreshed', data);
          }
        }
      });

      onCleanup(() => {
        unsubscribe();
        window.clearTimeout(manualRefreshTimer);
        window.clearTimeout(mutationRefreshTimer);
      });
    });
  }
}

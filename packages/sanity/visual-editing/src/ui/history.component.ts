import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
} from '@angular/core';

import type { HistoryAdapter, VisualEditingNode } from '../types';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'sanity-visual-editing-history',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryComponent {
  comlink = input.required<VisualEditingNode>();
  history = input<HistoryAdapter>();

  constructor() {
    effect((onCleanup) => {
      const comlink = this.comlink();
      const history = this.history();

      const unsubscribeNavigate = comlink.on(
        'presentation/navigate',
        (data) => {
          history?.update(data);
        },
      );

      onCleanup(unsubscribeNavigate);
    });

    effect((onCleanup) => {
      const comlink = this.comlink();
      const history = this.history();

      if (!history) {
        return;
      }

      const unsubscribe = history.subscribe((update) => {
        update.title = update.title || document.title;
        comlink.post('visual-editing/navigate', update);
      });

      onCleanup(unsubscribe);
    });
  }
}

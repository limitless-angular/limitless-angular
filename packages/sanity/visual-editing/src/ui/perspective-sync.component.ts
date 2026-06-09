import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
} from '@angular/core';
import type { VisualEditingControllerMsg } from '@sanity/presentation-comlink';

import type { VisualEditingNode } from '../types';

type PerspectiveMessage = Extract<
  VisualEditingControllerMsg,
  { type: 'presentation/perspective' }
>;

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'sanity-visual-editing-perspective-sync',
  standalone: true,
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerspectiveSyncComponent {
  comlink = input<VisualEditingNode>();

  perspectiveMessage = output<PerspectiveMessage>();

  constructor() {
    effect((onCleanup) => {
      const comlink = this.comlink();

      if (!comlink) {
        return;
      }

      const controller = new AbortController();

      comlink
        .fetch('visual-editing/fetch-perspective', undefined, {
          signal: controller.signal,
          suppressWarnings: true,
        })
        .then((data) => {
          this.emitPerspective(data as PerspectiveMessage['data']);
        })
        .catch(() => {
          // Optional Presentation capability; unsupported versions fail silently.
        });

      const unsubscribe = comlink.on('presentation/perspective', (data) => {
        this.emitPerspective(data as PerspectiveMessage['data']);
      });

      onCleanup(() => {
        unsubscribe();
        controller.abort();
      });
    });
  }

  private emitPerspective(data: PerspectiveMessage['data']): void {
    this.perspectiveMessage.emit({
      type: 'presentation/perspective',
      data,
    } as PerspectiveMessage);
  }
}

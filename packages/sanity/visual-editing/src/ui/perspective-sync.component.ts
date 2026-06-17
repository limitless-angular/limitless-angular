import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
} from '@angular/core';
import type { ClientPerspective } from '@sanity/client';
import type { VisualEditingControllerMsg } from '@sanity/presentation-comlink';

import type { VisualEditingNode } from '../types';

type PerspectiveMessage = Extract<
  VisualEditingControllerMsg,
  { type: 'presentation/perspective' }
>;

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'sanity-visual-editing-perspective-sync',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerspectiveSyncComponent {
  comlink = input<VisualEditingNode>();
  handlesPerspectiveChange = input(false);

  perspectiveMessage = output<PerspectiveMessage>();
  perspectiveChange = output<ClientPerspective>();

  constructor() {
    effect((onCleanup) => {
      const comlink = this.comlink();
      const handlesPerspectiveChange = this.handlesPerspectiveChange();

      if (!comlink) {
        return;
      }

      const controller = new AbortController();

      comlink
        .fetch(
          'visual-editing/fetch-perspective',
          { handlesPerspectiveChange },
          {
            signal: controller.signal,
            suppressWarnings: true,
          },
        )
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
    this.perspectiveChange.emit(data.perspective);
  }
}

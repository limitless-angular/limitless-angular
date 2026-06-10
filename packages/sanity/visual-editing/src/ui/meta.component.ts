import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
} from '@angular/core';

import type { VisualEditingNode } from '../types';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'sanity-visual-editing-meta',
  standalone: true,
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetaComponent {
  comlink = input.required<VisualEditingNode>();

  constructor() {
    effect((onCleanup) => {
      const comlink = this.comlink();

      const sendMeta = () => {
        comlink.post('visual-editing/meta', { title: document.title });
      };

      const observer = new MutationObserver(([mutation]) => {
        if (mutation?.target.nodeName === 'TITLE') {
          sendMeta();
        }
      });

      observer.observe(document.head, {
        subtree: true,
        characterData: true,
        childList: true,
      });
      sendMeta();

      onCleanup(() => observer.disconnect());
    });
  }
}

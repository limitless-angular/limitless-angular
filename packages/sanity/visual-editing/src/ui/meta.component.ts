import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
} from '@angular/core';

import { VisualEditingChannel } from '../types';

@Component({
  selector: 'lib-meta',
  standalone: true,
  template: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetaComponent {
  channel = input<VisualEditingChannel>();

  constructor() {
    effect(() => {
      const channel = this.channel();

      const sendMeta = () => {
        channel?.send('visual-editing/meta', { title: document.title });
      };

      const observer = new MutationObserver(([mutation]) => {
        if (mutation.target.nodeName === 'TITLE') {
          sendMeta();
        }
      });

      observer.observe(document.head, {
        subtree: true,
        characterData: true,
        childList: true,
      });

      sendMeta();

      return () => observer.disconnect();
    });
  }
}

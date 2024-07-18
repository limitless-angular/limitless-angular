import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PortableTextMarkComponent } from '@limitless-angular/sanity/portabletext';

interface SpeechSynthesisMark {
  _type: 'speech';
  pitch?: number;
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'button',
  standalone: true,
  template: `<ng-container #children />`,
  host: {
    '[class]': '"bg-black text-white hover:bg-black/90 h-9 rounded-md px-3"',
    '[type]': '"button"',
    '(click)': 'onClick()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpeechSynthesisComponent extends PortableTextMarkComponent<SpeechSynthesisMark> {
  onClick() {
    const pitch = this.value()?.pitch || 1;
    const msg = new SpeechSynthesisUtterance();
    msg.text = this.text();
    msg.pitch = pitch;
    window.speechSynthesis.speak(msg);
  }
}

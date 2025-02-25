import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';

import { ToolkitTextNode } from '@portabletext/toolkit';

import { PortableTextComponent } from './portable-text.component';

@Component({
  selector: 'lib-text',
  // prettier-ignore
  template: `<ng-template #textTmpl let-node>
    @if (node.text === '\\n') {
      @if (components().hardBreak === undefined) {<br />}
      @else if (components().hardBreak === false) {{{ '\\n' }}}
      @else {<ng-container *ngComponentOutlet="$any(components().hardBreak)" />}
    } @else {{{ node.text }}}
  </ng-template>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgComponentOutlet],
})
export class TextComponent {
  template =
    viewChild.required<TemplateRef<{ $implicit: ToolkitTextNode }>>('textTmpl');
  components = inject(PortableTextComponent).components;
}

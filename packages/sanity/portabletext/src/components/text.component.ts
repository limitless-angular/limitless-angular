import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';

import { ToolkitTextNode } from '@portabletext/toolkit';

import { PortableTextComponents } from '../types';

@Component({
  selector: 'lib-text',
  // prettier-ignore
  template: `<ng-template #textTmpl let-node let-components="components">
    @if (node.text === '\\n') {
      @if (components.hardBreak === undefined) {<br />}
      @else if (components.hardBreak === false) {{{ '\\n' }}}
      @else {<ng-container *ngComponentOutlet="components.hardBreak" />}
    } @else {{{ node.text }}}
  </ng-template>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgComponentOutlet],
})
export class TextComponent {
  template = viewChild.required<
    TemplateRef<{
      $implicit: ToolkitTextNode;
      components: Partial<PortableTextComponents>;
    }>
  >('textTmpl');
}

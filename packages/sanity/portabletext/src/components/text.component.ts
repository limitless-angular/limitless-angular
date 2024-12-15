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
      @else {{{ '\\n' }}}
    } @else {{{ node.text }}}
  </ng-template>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class TextComponent {
  template = viewChild.required<
    TemplateRef<{
      $implicit: ToolkitTextNode;
      components: Partial<PortableTextComponents>;
    }>
  >('textTmpl');
}

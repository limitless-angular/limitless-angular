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
  // prettier-ignore
  template: `<ng-template let-node let-components="components">
    @if (node.text === '\\n') {
      @if (components.hardBreak) {<ng-container *ngComponentOutlet="components.hardBreak" />}
      @else {{{ '\\n' }}}
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
      components: PortableTextComponents;
    }>
  >(TemplateRef);
}

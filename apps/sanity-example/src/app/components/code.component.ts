import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';

import { PortableTextTypeComponent } from '@limitless-angular/sanity/portabletext';
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript.js';

interface CodeBlock {
  _type: 'code';
  code: string;
  language?: string;
}

@Component({
  selector: 'app-code-block',
  standalone: true,
  template: `
    <pre
      class="not-prose"
    ><code #codeElement [class]="'language-' + (value().language ?? 'javascript')"></code></pre>
  `,
  // This is only to avoid a blink while the style loads
  styleUrl: '../../../../../node_modules/prismjs/themes/prism-okaidia.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class CodeComponent
  extends PortableTextTypeComponent<CodeBlock>
  implements AfterViewInit
{
  codeElement = viewChild.required<ElementRef<HTMLElement>>('codeElement');

  override ngAfterViewInit() {
    super.ngAfterViewInit();
    const codeElement = this.codeElement().nativeElement;
    codeElement.textContent = this.value().code;
    Prism.highlightElement(codeElement);
  }
}

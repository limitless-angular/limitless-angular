import { expect, test, describe } from 'vitest';
import { Component } from '@angular/core';
import { aliasedInput, render } from '@testing-library/angular';
import { PortableTextComponent } from '../components/portable-text.component';
import { PortableTextTypeComponent } from '../directives/portable-text-directives';
import * as complexExamples from './fixtures/080-complex-real-world';
import { CodeComponent } from './test-components/CodeComponent';
import { HighlightComponent } from './test-components/HighlightComponent';
import { RatingComponent } from './test-components/RatingComponent';
import { ButtonComponent } from './test-components/ButtonComponent';

// Simple image component for testing
@Component({
  selector: 'lib-image-component',
  template: `
    <figure>
      <img [src]="value().asset._ref" [alt]="value().alt" />
      @if (value().caption) {
        <figcaption>{{ value().caption }}</figcaption>
      }
    </figure>
  `,
})
export class ImageComponent extends PortableTextTypeComponent {}

// Simple callout component for testing
@Component({
  selector: 'lib-callout-component',
  imports: [PortableTextComponent],
  template: `
    <div class="callout callout-{{ value().type }}">
      @if (value().title) {
        <h4>{{ value().title }}</h4>
      }
      <div portable-text [value]="value().text"></div>
    </div>
  `,
})
export class CalloutComponent extends PortableTextTypeComponent {}

describe('PortableText Complex Examples', () => {
  test('renders complex article with multiple block types', async () => {
    // Set up the complex article content
    const { fixture } = await render(PortableTextComponent, {
      inputs: {
        value: complexExamples.complexArticle.input,
        ...aliasedInput('components', {
          types: {
            image: ImageComponent,
            code: CodeComponent,
            callout: CalloutComponent,
          },
          marks: {
            highlight: HighlightComponent,
          },
        }),
      },
    });

    // Verify headings are rendered correctly
    const h1Elements = fixture.nativeElement.querySelectorAll('h1');
    expect(h1Elements.length).toBe(1);
    expect(h1Elements[0].textContent).toBe(
      'The Ultimate Guide to Portable Text',
    );

    const h2Elements = fixture.nativeElement.querySelectorAll('h2');
    expect(h2Elements.length).toBe(3);

    // Verify lists are rendered correctly
    const ulElements = fixture.nativeElement.querySelectorAll('ul');
    expect(ulElements.length).toBe(2);

    const olElements = fixture.nativeElement.querySelectorAll('ol');
    expect(olElements.length).toBe(1);

    // Verify image is rendered
    const imgElements = fixture.nativeElement.querySelectorAll('img');
    expect(imgElements.length).toBe(1);
    expect(imgElements[0].getAttribute('alt')).toBe(
      'Diagram showing Portable Text structure',
    );

    // Verify code block is rendered
    const preElements = fixture.nativeElement.querySelectorAll('pre');
    expect(preElements.length).toBe(1);

    // Verify links are rendered correctly
    const linkElements = fixture.nativeElement.querySelectorAll('a');
    expect(linkElements.length).toBe(1);
    expect(linkElements[0].getAttribute('href')).toBe(
      'https://portabletext.org/',
    );

    // Verify callout is rendered
    const calloutElements = fixture.nativeElement.querySelectorAll('.callout');
    expect(calloutElements.length).toBe(1);
  });

  test('renders complex nested content with mixed marks and lists', async () => {
    // Set up the complex nested content
    const { fixture } = await render(PortableTextComponent, {
      inputs: {
        value: complexExamples.complexNestedContent.input,
        ...aliasedInput('components', {
          marks: {
            highlight: HighlightComponent,
          },
          types: {
            inlineObject: RatingComponent,
            button: ButtonComponent,
          },
        }),
      },
    });

    // Verify complex marks are rendered correctly
    const strongElements = fixture.nativeElement.querySelectorAll('strong');
    expect(strongElements.length).toBeGreaterThan(0);

    const highlightElements =
      fixture.nativeElement.querySelectorAll('.highlight');
    expect(highlightElements.length).toBeGreaterThan(0);

    // Verify deeply nested lists are rendered correctly
    const nestedLists = fixture.nativeElement.querySelectorAll('ul ul');
    expect(nestedLists.length).toBeGreaterThan(0);

    const deeplyNestedLists =
      fixture.nativeElement.querySelectorAll('ul ul ul');
    expect(deeplyNestedLists.length).toBeGreaterThan(0);

    // Verify mixed list types (bullet and numbered)
    const olInUl = fixture.nativeElement.querySelectorAll('ul ol');
    expect(olInUl.length).toBeGreaterThan(0);
  });
});

import type { ArbitraryTypedObject } from '@portabletext/types';

// A complex real-world example with multiple block types, nested lists,
// custom marks, and inline objects
export const complexArticle = {
  input: [
    {
      _type: 'block',
      _key: 'heading1',
      style: 'h1',
      children: [
        {
          _type: 'span',
          _key: 'heading1-span',
          text: 'The Ultimate Guide to Portable Text',
          marks: ['highlight'],
        },
      ],
      markDefs: [
        {
          _key: 'highlight',
          _type: 'highlight',
          thickness: 2,
        },
      ],
    },
    {
      _type: 'block',
      _key: 'intro',
      style: 'normal',
      children: [
        {
          _type: 'span',
          _key: 'intro-span1',
          text: 'This comprehensive guide explores ',
          marks: [],
        },
        {
          _type: 'span',
          _key: 'intro-span2',
          text: 'Portable Text',
          marks: ['strong', 'em', 'highlight'],
        },
        {
          _type: 'span',
          _key: 'intro-span3',
          text: ' - a JSON-based rich text specification that powers modern content systems.',
          marks: [],
        },
      ],
      markDefs: [
        {
          _key: 'highlight',
          _type: 'highlight',
          thickness: 2,
        },
      ],
    },
    {
      _type: 'image',
      _key: 'main-image',
      asset: {
        _ref: 'image-abc123-1200x800-jpg',
        _type: 'reference',
      },
      caption: 'Portable Text in action',
      alt: 'Diagram showing Portable Text structure',
    },
    {
      _type: 'block',
      _key: 'section1',
      style: 'h2',
      children: [
        {
          _type: 'span',
          _key: 'section1-span',
          text: 'Key Features',
          marks: [],
        },
      ],
      markDefs: [],
    },
    {
      _type: 'block',
      _key: 'features-intro',
      style: 'normal',
      children: [
        {
          _type: 'span',
          _key: 'features-intro-span',
          text: 'Here are the main features that make Portable Text powerful:',
          marks: [],
        },
      ],
      markDefs: [],
    },
    {
      _type: 'block',
      _key: 'feature-list-1',
      style: 'normal',
      listItem: 'bullet',
      level: 1,
      children: [
        {
          _type: 'span',
          _key: 'feature1-span1',
          text: 'JSON-based: ',
          marks: ['strong'],
        },
        {
          _type: 'span',
          _key: 'feature1-span2',
          text: 'Easy to parse and generate with any programming language',
          marks: [],
        },
      ],
      markDefs: [],
    },
    {
      _type: 'block',
      _key: 'feature-list-2',
      style: 'normal',
      listItem: 'bullet',
      level: 1,
      children: [
        {
          _type: 'span',
          _key: 'feature2-span1',
          text: 'Extensible: ',
          marks: ['strong'],
        },
        {
          _type: 'span',
          _key: 'feature2-span2',
          text: 'Can embed custom objects and marks',
          marks: [],
        },
      ],
      markDefs: [],
    },
    {
      _type: 'block',
      _key: 'feature-list-3',
      style: 'normal',
      listItem: 'bullet',
      level: 1,
      children: [
        {
          _type: 'span',
          _key: 'feature3-span1',
          text: 'Portable: ',
          marks: ['strong'],
        },
        {
          _type: 'span',
          _key: 'feature3-span2',
          text: 'Can be rendered to any format (HTML, React, Angular, etc.)',
          marks: [],
        },
      ],
      markDefs: [],
    },
    {
      _type: 'block',
      _key: 'section2',
      style: 'h2',
      children: [
        {
          _type: 'span',
          _key: 'section2-span',
          text: 'Example Use Cases',
          marks: [],
        },
      ],
      markDefs: [],
    },
    {
      _type: 'block',
      _key: 'use-case-intro',
      style: 'normal',
      children: [
        {
          _type: 'span',
          _key: 'use-case-intro-span',
          text: 'Portable Text is ideal for:',
          marks: [],
        },
      ],
      markDefs: [],
    },
    {
      _type: 'block',
      _key: 'use-case-list-1',
      style: 'normal',
      listItem: 'number',
      level: 1,
      children: [
        {
          _type: 'span',
          _key: 'use-case1-span',
          text: 'Content management systems',
          marks: [],
        },
      ],
      markDefs: [],
    },
    {
      _type: 'block',
      _key: 'use-case-list-2',
      style: 'normal',
      listItem: 'number',
      level: 1,
      children: [
        {
          _type: 'span',
          _key: 'use-case2-span',
          text: 'Blogging platforms',
          marks: [],
        },
      ],
      markDefs: [],
    },
    {
      _type: 'block',
      _key: 'use-case-list-3',
      style: 'normal',
      listItem: 'number',
      level: 1,
      children: [
        {
          _type: 'span',
          _key: 'use-case3-span',
          text: 'Documentation sites',
          marks: [],
        },
      ],
      markDefs: [],
    },
    {
      _type: 'block',
      _key: 'use-case-list-3-1',
      style: 'normal',
      listItem: 'bullet',
      level: 2,
      children: [
        {
          _type: 'span',
          _key: 'use-case3-1-span',
          text: 'API documentation',
          marks: [],
        },
      ],
      markDefs: [],
    },
    {
      _type: 'block',
      _key: 'use-case-list-3-2',
      style: 'normal',
      listItem: 'bullet',
      level: 2,
      children: [
        {
          _type: 'span',
          _key: 'use-case3-2-span',
          text: 'User guides',
          marks: [],
        },
      ],
      markDefs: [],
    },
    {
      _type: 'block',
      _key: 'section3',
      style: 'h2',
      children: [
        {
          _type: 'span',
          _key: 'section3-span',
          text: 'Code Example',
          marks: [],
        },
      ],
      markDefs: [],
    },
    {
      _type: 'code',
      _key: '9a15ea2ed8a2',
      language: 'javascript',
      code: `import foo from "foo"

foo("hi there", (err, thing) => {
  console.log(err)
})
`,
    },
    {
      _type: 'block',
      _key: 'conclusion',
      style: 'normal',
      children: [
        {
          _type: 'span',
          _key: 'conclusion-span1',
          text: 'For more information, visit the ',
          marks: [],
        },
        {
          _type: 'span',
          _key: 'conclusion-span2',
          text: 'official documentation',
          marks: ['link-1'],
        },
        {
          _type: 'span',
          _key: 'conclusion-span3',
          text: '.',
          marks: [],
        },
      ],
      markDefs: [
        {
          _key: 'link-1',
          _type: 'link',
          href: 'https://portabletext.org/',
        },
      ],
    },
    {
      _type: 'callout',
      _key: 'callout-1',
      type: 'info',
      title: 'Pro Tip',
      text: [
        {
          _type: 'block',
          _key: 'callout-text',
          style: 'normal',
          children: [
            {
              _type: 'span',
              _key: 'callout-span',
              text: 'Use the @portabletext/toolkit package for advanced transformations.',
              marks: [],
            },
          ],
          markDefs: [],
        },
      ],
    },
  ],
  output:
    '<h1>The Ultimate Guide to Portable Text</h1><p>This comprehensive guide explores <strong><em>Portable Text</em></strong> - a JSON-based rich text specification that powers modern content systems.</p><figure><img src="image-abc123-1200x800-jpg" alt="Diagram showing Portable Text structure"/><figcaption>Portable Text in action</figcaption></figure><h2>Key Features</h2><p>Here are the main features that make Portable Text powerful:</p><ul><li><strong>JSON-based: </strong>Easy to parse and generate with any programming language</li><li><strong>Extensible: </strong>Can embed custom objects and marks</li><li><strong>Portable: </strong>Can be rendered to any format (HTML, React, Angular, etc.)</li></ul><h2>Example Use Cases</h2><p>Portable Text is ideal for:</p><ol><li>Content management systems</li><li>Blogging platforms</li><li>Documentation sites<ul><li>API documentation</li><li>User guides</li></ul></li></ol><h2>Code Example</h2><pre data-language="typescript"><code>// Example of rendering Portable Text in Angular\nimport { Component, Input } from \'@angular/core\';\nimport { PortableTextComponent } from \'@limitless-angular/sanity/portabletext\';\n\n@Component({\n  selector: \'app-content\',\n  template: `<div [portable-text]="content"></div>`,\n})\nexport class ContentComponent {\n  @Input() content: any;\n}</code></pre><p>For more information, visit the <a href="https://portabletext.org/">official documentation</a>.</p><div class="callout callout-info"><h4>Pro Tip</h4><p>Use the @portabletext/toolkit package for advanced transformations.</p></div>',
};

// A complex example with multiple levels of nesting and various mark combinations
export const complexNestedContent = {
  input: [
    {
      _type: 'block',
      _key: 'nested1',
      style: 'normal',
      children: [
        {
          _type: 'span',
          _key: 'nested1-span1',
          text: 'This example tests ',
          marks: [],
        },
        {
          _type: 'span',
          _key: 'nested1-span2',
          text: 'deeply nested',
          marks: ['strong', 'highlight'],
        },
        {
          _type: 'span',
          _key: 'nested1-span3',
          text: ' content with ',
          marks: [],
        },
        {
          _type: 'span',
          _key: 'nested1-span4',
          text: 'multiple',
          marks: ['em'],
        },
        {
          _type: 'span',
          _key: 'nested1-span5',
          text: ' different ',
          marks: [],
        },
        {
          _type: 'span',
          _key: 'nested1-span6',
          text: 'mark combinations',
          marks: ['strong', 'underline', 'mark2'],
        },
        {
          _type: 'span',
          _key: 'nested1-span7',
          text: '.',
          marks: [],
        },
      ],
      markDefs: [
        {
          _key: 'highlight',
          _type: 'highlight',
          thickness: 2,
        },
        {
          _key: 'mark2',
          _type: 'link',
          href: 'https://example.com',
        },
      ],
    },
    {
      _type: 'block',
      _key: 'nested2',
      style: 'normal',
      listItem: 'bullet',
      level: 1,
      children: [
        {
          _type: 'span',
          _key: 'nested2-span1',
          text: 'Level 1 item',
          marks: [],
        },
      ],
    },
    {
      _type: 'block',
      _key: 'nested3',
      style: 'normal',
      listItem: 'bullet',
      level: 2,
      children: [
        {
          _type: 'span',
          _key: 'nested3-span1',
          text: 'Level 2 item',
          marks: [],
        },
      ],
    },
    {
      _type: 'block',
      _key: 'nested4',
      style: 'normal',
      listItem: 'bullet',
      level: 3,
      children: [
        {
          _type: 'span',
          _key: 'nested4-span1',
          text: 'Level 3 item with ',
          marks: [],
        },
        {
          _type: 'span',
          _key: 'nested4-span2',
          text: 'inline',
          marks: ['code'],
        },
        {
          _type: 'span',
          _key: 'nested4-span3',
          text: ' code',
          marks: [],
        },
      ],
    },
    {
      _type: 'block',
      _key: 'nested5',
      style: 'normal',
      listItem: 'number',
      level: 4,
      children: [
        {
          _type: 'span',
          _key: 'nested5-span1',
          text: 'Level 4 numbered item',
          marks: [],
        },
      ],
    },
    {
      _type: 'block',
      _key: 'nested6',
      style: 'normal',
      listItem: 'number',
      level: 3,
      children: [
        {
          _type: 'span',
          _key: 'nested6-span1',
          text: 'Back to level 3 (numbered)',
          marks: [],
        },
      ],
    },
    {
      _type: 'block',
      _key: 'nested7',
      style: 'normal',
      listItem: 'bullet',
      level: 1,
      children: [
        {
          _type: 'span',
          _key: 'nested7-span1',
          text: 'Back to level 1 (bullet)',
          marks: [],
        },
      ],
    },
    {
      _type: 'block',
      _key: 'nested8',
      style: 'normal',
      children: [
        {
          _type: 'span',
          _key: 'nested8-span1',
          text: 'This paragraph contains an ',
          marks: [],
        },
        {
          _type: 'inlineObject',
          _key: 'nested8-rating',
          rating: 4.5,
          text: '★★★★½',
        },
        {
          _type: 'span',
          _key: 'nested8-span2',
          text: ' inline object and a ',
          marks: [],
        },
        {
          _type: 'button',
          _key: 'nested8-button',
          text: 'Click me',
          url: 'https://example.com/action',
        },
        {
          _type: 'span',
          _key: 'nested8-span3',
          text: ' button.',
          marks: [],
        },
      ],
    },
  ],
  output:
    '<p>This example tests <strong class="highlight" style="border: 2px solid;">deeply nested</strong> content with <em>multiple</em> different <a href="https://example.com"><strong><u>mark combinations</u></strong></a>.</p><ul><li>Level 1 item<ul><li>Level 2 item<ul><li>Level 3 item with <code>inline</code> code<ol><li>Level 4 numbered item</li></ol><ol><li>Back to level 3 (numbered)</li></ol></li></ul></li></ul></li><li>Back to level 1 (bullet)</li></ul><p>This paragraph contains an <span class="rating">★★★★½</span> inline object and a <button class="btn" onclick="window.location.href=\'https://example.com/action\'">Click me</button> button.</p>',
};

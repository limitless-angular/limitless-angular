# @limitless-angular/sanity/portabletext

[![npm version](https://img.shields.io/npm/v/@limitless-angular/sanity/portabletext.svg?style=flat-square)](https://www.npmjs.com/package/@limitless-angular/sanity/portabletext)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@limitless-angular/sanity/portabletext?style=flat-square)](https://bundlephobia.com/result?p=@limitless-angular/sanity/portabletext)
[![Build Status](https://img.shields.io/github/actions/workflow/status/limitless-angular/angular-sanity/main.yml?branch=main&style=flat-square)](https://github.com/limitless-angular/angular-sanity/actions?query=workflow%3Atest)

Render [Portable Text](https://portabletext.org/) with Angular.

## Table of contents

- [Installation](#installation)
- [Basic usage](#basic-usage)
- [Styling](#styling-the-output)
- [Customizing components](#customizing-components)
- [Available components](#available-components)
  - [types](#types)
  - [marks](#marks)
  - [block](#block)
  - [list](#list)
  - [listItem](#listitem)
  - [hardBreak](#hardbreak)
- [Typing Portable Text](#typing-portable-text)

## Installation

```
npm install --save @limitless-angular/sanity/portabletext
```

## Basic usage

In your component:

```typescript
import { Component } from '@angular/core';
import { PortableTextComponent, PortableTextComponents } from '@limitless-angular/sanity/portabletext';

@Component({
  selector: 'app-your-component',
  template: ` <div portable-text [value]="portableTextValue" [components]="customComponents"></div> `,
  standalone: true,
  imports: [PortableTextComponent],
})
export class YourComponent {
  portableTextValue = [
    /* array of portable text blocks */
  ];
  customComponents: PortableTextComponents = {
    // optional object of custom components to use
  };
}
```

## Styling the output

The rendered HTML does not have any styling applied, so you will either render a parent container with a class name you can target in your CSS, or pass [custom components](#customizing-components) if you want to control the direct markup and CSS of each element.

## Customizing components

Default components are provided for all standard features of the Portable Text spec, with logical HTML defaults. You can pass an object of components to use, both to override the defaults and to provide components for your custom content types.

Here are two examples for each case: one using direct HTML element selectors, and another using wrapper selectors:

### Example without wrapper selectors (using direct HTML element selectors):

```typescript
import { Component, computed, input } from '@angular/core';
import { PortableTextComponent, PortableTextComponents, PortableTextMarkComponent, PortableTextBlockComponent, PortableTextListComponent, PortableTextListItemComponent } from '@limitless-angular/sanity/portabletext';

@Component({
  selector: 'a',
  standalone: true,
  template: `<ng-container #children />`,
})
export class LinkComponent extends PortableTextMarkComponent {
  value = input.required<{ href: string }>();
}

@Component({
  selector: 'p',
  standalone: true,
  template: `<ng-container #children />`,
  host: { '[class.text-purple-700]': 'true' },
})
export class ParagraphComponent extends PortableTextBlockComponent {}

@Component({
  selector: 'ul',
  standalone: true,
  template: `<ng-container #children />`,
  host: {
    '[class.font-light]': 'true',
  },
})
export class BulletListComponent extends PortableTextListComponent {}

@Component({
  selector: 'li',
  standalone: true,
  template: `<ng-container #children />`,
  styles: `
    :host {
      list-style-type: disclosure-closed;
    }
  `,
  host: {
    '[class.text-purple-700]': 'true',
  },
})
export class ListItemComponent extends PortableTextListItemComponent {}

@Component({
  selector: 'app-your-component',
  template: ` <div portable-text [value]="value" [components]="customComponents"></div> `,
  standalone: true,
  imports: [PortableTextComponent],
})
export class YourComponent {
  value = [
    /* array of portable text blocks */
  ];

  protected readonly customComponents: PortableTextComponents = {
    marks: {
      link: LinkComponent,
    },
    block: {
      normal: ParagraphComponent,
    },
    list: {
      bullet: BulletListComponent,
    },
    listItem: {
      bullet: ListItemComponent,
    },
  };
}
```

### Example with wrapper selectors:

```typescript
import { Component, computed, input } from '@angular/core';
import { PortableTextComponent, PortableTextComponents, PortableTextMarkComponent, PortableTextBlockComponent, PortableTextListComponent, PortableTextListItemComponent } from '@limitless-angular/sanity/portabletext';

@Component({
  selector: 'app-link',
  standalone: true,
  template: `<a [href]="value()?.['href']"><ng-container #children /></a>`,
})
export class LinkComponent extends PortableTextMarkComponent {
  value = input.required<{ href: string }>();
}

@Component({
  selector: 'app-paragraph',
  standalone: true,
  template: `<p class="text-purple-700"><ng-container #children /></p>`,
})
export class ParagraphComponent extends PortableTextBlockComponent {}

@Component({
  selector: 'app-bullet-list',
  standalone: true,
  template: `<ul class="font-light">
    <ng-container #children />
  </ul>`,
})
export class BulletListComponent extends PortableTextListComponent {}

@Component({
  selector: 'app-list-item',
  standalone: true,
  template: `<li class="text-purple-700" style="list-style-type: disclosure-closed"><ng-container #children /></li>`,
})
export class ListItemComponent extends PortableTextListItemComponent {}

@Component({
  selector: 'app-your-component',
  template: ` <div portable-text [value]="value" [components]="customComponents"></div> `,
  standalone: true,
  imports: [PortableTextComponent],
})
export class YourComponent {
  value = [
    /* array of portable text blocks */
  ];

  protected readonly customComponents: PortableTextComponents = {
    marks: {
      link: LinkComponent,
    },
    block: {
      normal: ParagraphComponent,
    },
    list: {
      bullet: BulletListComponent,
    },
    listItem: {
      bullet: ListItemComponent,
    },
  };
}
```

## Available components

These are the overridable/implementable keys:

### `types`

An object of Angular components that renders different types of objects that might appear both as part of the input array, or as inline objects within text blocks - eg alongside text spans.

Use the `isInline` property to check whether or not this is an inline object or a block.

The object has the shape `{typeName: AngularComponent}`, where `typeName` is the value set in individual `_type` attributes.

Example of rendering a custom `image` object:

#### Without wrapper selector:

```typescript
import { Component, computed, input } from '@angular/core';
import { PortableTextComponent, PortableTextComponents, PortableTextTypeComponent } from '@limitless-angular/sanity/portabletext';
import { urlBuilder } from '@sanity/image-url';
import { getImageDimensions } from '@sanity/asset-utils';

@Component({
  selector: 'img[portableTextImage]',
  standalone: true,
  template: '',
  host: {
    '[src]': 'imageUrl()',
    '[alt]': 'value().alt || " "',
    loading: 'lazy',
    '[style.display]': 'isInline() ? "inline-block" : "block"',
    '[style.aspectRatio]': 'aspectRatio()',
  },
})
export class SampleImageComponent extends PortableTextTypeComponent {
  value = input.required<any>();
  isInline = input.required<boolean>();

  imageUrl = computed(() =>
    urlBuilder()
      .image(this.value())
      .width(this.isInline() ? 100 : 800)
      .fit('max')
      .auto('format')
      .url(),
  );

  aspectRatio = computed(() => {
    const { width, height } = getImageDimensions(this.value());
    return `${width} / ${height}`;
  });
}

@Component({
  selector: 'app-your-component',
  template: ` <div portable-text [value]="portableTextValue" [components]="components"></div> `,
  standalone: true,
  imports: [PortableTextComponent],
})
export class YourComponent {
  portableTextValue = [
    /* array of portable text blocks */
  ];

  components: PortableTextComponents = {
    types: {
      image: SampleImageComponent,
      // Any other custom types you have in your content
    },
  };
}
```

#### With wrapper selector:

```typescript
import { Component, computed, input } from '@angular/core';
import { PortableTextComponent, PortableTextComponents, PortableTextTypeComponent } from '@limitless-angular/sanity/portabletext';
import { urlBuilder } from '@sanity/image-url';
import { getImageDimensions } from '@sanity/asset-utils';

@Component({
  selector: 'app-sample-image',
  standalone: true,
  template: ` <img [src]="imageUrl()" [alt]="value().alt || ' '" loading="lazy" [style.display]="isInline() ? 'inline-block' : 'block'" [style.aspectRatio]="aspectRatio()" /> `,
})
export class SampleImageComponent extends PortableTextTypeComponent {
  value = input.required<any>();
  isInline = input.required<boolean>();

  imageUrl = computed(() =>
    urlBuilder()
      .image(this.value())
      .width(this.isInline() ? 100 : 800)
      .fit('max')
      .auto('format')
      .url(),
  );

  aspectRatio = computed(() => {
    const { width, height } = getImageDimensions(this.value());
    return `${width} / ${height}`;
  });
}

@Component({
  selector: 'app-your-component',
  template: ` <div portable-text [value]="portableTextValue" [components]="components"></div> `,
  standalone: true,
  imports: [PortableTextComponent],
})
export class YourComponent {
  portableTextValue = [
    /* array of portable text blocks */
  ];

  components: PortableTextComponents = {
    types: {
      image: SampleImageComponent,
      // Any other custom types you have in your content
    },
  };
}
```

### `marks`

Object of Angular components that renders different types of marks that might appear in spans. Marks can either be simple "decorators" (eg emphasis, underline, italic) or full "annotations" which include associated data (eg links, references, descriptions).

If the mark is a decorator, the component will receive a `markType` input which has the name of the decorator (eg `em`). If the mark is an annotation, it will receive both a `markType` with the associated `_type` property (eg `link`), and a `value` input with an object holding the data for this mark.

The component also receives a `children` input that should (usually) be returned in whatever parent container component makes sense for this mark (eg `<a>`, `<em>`).

#### Without wrapper selectors:

```typescript
import { Component, computed, input } from '@angular/core';
import { PortableTextComponent, PortableTextComponents, PortableTextMarkComponent } from '@limitless-angular/sanity/portabletext';

@Component({
  selector: 'em',
  standalone: true,
  template: `<ng-container #children />`,
  host: {
    '[class.text-gray-600]': 'true',
    '[class.font-semibold]': 'true',
  },
})
export class EmComponent extends PortableTextMarkComponent {}

@Component({
  selector: 'a',
  standalone: true,
  template: `<ng-container #children />`,
  host: {
    '[href]': 'value()?.href',
    '[target]': 'target()',
    '[rel]': 'rel()',
  },
})
export class LinkComponent extends PortableTextMarkComponent {
  value = input.required<{ href: string }>();

  target = computed(() => ((this.value().href || '').startsWith('http') ? '_blank' : undefined));

  rel = computed(() => (this.target() === '_blank' ? 'noindex nofollow' : undefined));
}

@Component({
  selector: 'app-your-component',
  template: ` <div portable-text [value]="portableTextValue" [components]="components"></div> `,
  standalone: true,
  imports: [PortableTextComponent],
})
export class YourComponent {
  portableTextValue = [
    /* array of portable text blocks */
  ];

  components: PortableTextComponents = {
    marks: {
      em: EmComponent,
      link: LinkComponent,
    },
  };
}
```

#### With wrapper selectors:

```typescript
import { Component, computed, input } from '@angular/core';
import { PortableTextComponent, PortableTextComponents, PortableTextMarkComponent } from '@limitless-angular/sanity/portabletext';

@Component({
  selector: 'app-em',
  standalone: true,
  template: `<em class="text-gray-600 font-semibold"><ng-container #children /></em>`,
})
export class EmComponent extends PortableTextMarkComponent {}

@Component({
  selector: 'app-link',
  standalone: true,
  template: `
    <a [href]="value()?.href" [target]="target()" [rel]="rel()">
      <ng-container #children />
    </a>
  `,
})
export class LinkComponent extends PortableTextMarkComponent {
  value = input.required<{ href: string }>();

  target = computed(() => ((this.value().href || '').startsWith('http') ? '_blank' : undefined));

  rel = computed(() => (this.target() === '_blank' ? 'noindex nofollow' : undefined));
}

@Component({
  selector: 'app-your-component',
  template: ` <div portable-text [value]="portableTextValue" [components]="components"></div> `,
  standalone: true,
  imports: [PortableTextComponent],
})
export class YourComponent {
  portableTextValue = [
    /* array of portable text blocks */
  ];

  components: PortableTextComponents = {
    marks: {
      em: EmComponent,
      link: LinkComponent,
    },
  };
}
```

### `block`

An object of Angular components that renders portable text blocks with different `style` properties. The object has the shape `{styleName: AngularComponent}`, where `styleName` is the value set in individual `style` attributes on blocks (`normal` being the default).

#### Without wrapper selectors:

```typescript
import { Component } from '@angular/core';
import { PortableTextComponent, PortableTextComponents, PortableTextBlockComponent } from '@limitless-angular/sanity/portabletext';

@Component({
  selector: 'h1',
  standalone: true,
  template: `<ng-container #children />`,
  host: { '[class.text-2xl]': 'true' },
})
export class H1Component extends PortableTextBlockComponent {}

@Component({
  selector: 'blockquote',
  standalone: true,
  template: `<ng-container #children />`,
  host: { '[class.border-l-purple-500]': 'true' },
})
export class BlockquoteComponent extends PortableTextBlockComponent {}

@Component({
  selector: 'h2[customHeading]',
  standalone: true,
  template: `<ng-container #children />`,
  host: {
    '[class.text-lg]': 'true',
    '[class.text-primary]': 'true',
    '[class.text-purple-700]': 'true',
  },
})
export class CustomHeadingComponent extends PortableTextBlockComponent {}

@Component({
  selector: 'app-your-component',
  template: ` <div portable-text [value]="portableTextValue" [components]="components"></div> `,
  standalone: true,
  imports: [PortableTextComponent],
})
export class YourComponent {
  portableTextValue = [
    /* array of portable text blocks */
  ];

  components: PortableTextComponents = {
    block: {
      h1: H1Component,
      blockquote: BlockquoteComponent,
      customHeading: CustomHeadingComponent,
    },
  };
}
```

#### With wrapper selectors:

```typescript
import { Component } from '@angular/core';
import { PortableTextComponent, PortableTextComponents, PortableTextBlockComponent } from '@limitless-angular/sanity/portabletext';

@Component({
  selector: 'app-h1',
  standalone: true,
  template: `<h1 class="text-2xl"><ng-container #children /></h1>`,
})
export class H1Component extends PortableTextBlockComponent {}

@Component({
  selector: 'app-blockquote',
  standalone: true,
  template: `<blockquote class="border-l-purple-500"><ng-container #children /></blockquote>`,
})
export class BlockquoteComponent extends PortableTextBlockComponent {}

@Component({
  selector: 'app-custom-heading',
  standalone: true,
  template: `<h2 class="text-lg text-primary text-purple-700"><ng-container #children /></h2>`,
})
export class CustomHeadingComponent extends PortableTextBlockComponent {}

@Component({
  selector: 'app-your-component',
  template: ` <div portable-text [value]="portableTextValue" [components]="components"></div> `,
  standalone: true,
  imports: [PortableTextComponent],
})
export class YourComponent {
  portableTextValue = [
    /* array of portable text blocks */
  ];

  components: PortableTextComponents = {
    block: {
      h1: H1Component,
      blockquote: BlockquoteComponent,
      customHeading: CustomHeadingComponent,
    },
  };
}
```

The `block` object can also be set to a single Angular component, which would handle block styles of _any_ type.

### `list`

Object of Angular components used to render lists of different types (`bullet` vs `number`, for instance, which by default is `<ul>` and `<ol>`, respectively).

Note that there is no actual "list" node type in the Portable Text specification, but a series of list item blocks with the same `level` and `listItem` properties will be grouped into a virtual one inside of this library.

#### Without wrapper selectors:

```typescript
import { Component } from '@angular/core';
import { PortableTextComponent, PortableTextComponents, PortableTextListComponent } from '@limitless-angular/sanity/portabletext';

@Component({
  selector: 'ul',
  standalone: true,
  template: `<ng-container #children />`,
  host: { '[class.mt-xl]': 'true' },
})
export class BulletListComponent extends PortableTextListComponent {}

@Component({
  selector: 'ol',
  standalone: true,
  template: `<ng-container #children />`,
  host: { '[class.mt-lg]': 'true' },
})
export class NumberListComponent extends PortableTextListComponent {}

@Component({
  selector: 'ol[checkmarks]',
  standalone: true,
  template: `<ng-container #children />`,
  host: {
    '[class.m-auto]': 'true',
    '[class.text-lg]': 'true',
  },
})
export class CheckmarksListComponent extends PortableTextListComponent {}

@Component({
  selector: 'app-your-component',
  template: ` <div portable-text [value]="portableTextValue" [components]="components"></div> `,
  standalone: true,
  imports: [PortableTextComponent],
})
export class YourComponent {
  portableTextValue = [
    /* array of portable text blocks */
  ];

  components: PortableTextComponents = {
    list: {
      bullet: BulletListComponent,
      number: NumberListComponent,
      checkmarks: CheckmarksListComponent,
    },
  };
}
```

#### With wrapper selectors:

```typescript
import { Component } from '@angular/core';
import { PortableTextComponent, PortableTextComponents, PortableTextListComponent } from '@limitless-angular/sanity/portabletext';

@Component({
  selector: 'app-bullet-list',
  standalone: true,
  template: `<ul class="mt-xl">
    <ng-container #children />
  </ul>`,
})
export class BulletListComponent extends PortableTextListComponent {}

@Component({
  selector: 'app-number-list',
  standalone: true,
  template: `<ol class="mt-lg">
    <ng-container #children />
  </ol>`,
})
export class NumberListComponent extends PortableTextListComponent {}

@Component({
  selector: 'app-checkmarks-list',
  standalone: true,
  template: `<ol class="m-auto text-lg">
    <ng-container #children />
  </ol>`,
})
export class CheckmarksListComponent extends PortableTextListComponent {}

@Component({
  selector: 'app-your-component',
  template: ` <div portable-text [value]="portableTextValue" [components]="components"></div> `,
  standalone: true,
  imports: [PortableTextComponent],
})
export class YourComponent {
  portableTextValue = [
    /* array of portable text blocks */
  ];

  components: PortableTextComponents = {
    list: {
      bullet: BulletListComponent,
      number: NumberListComponent,
      checkmarks: CheckmarksListComponent,
    },
  };
}
```

The `list` property can also be set to a single Angular component, which would handle lists of _any_ type.

### `listItem`

Object of Angular components used to render different list item styles. The object has the shape `{listItemType: AngularComponent}`, where `listItemType` is the value set in individual `listItem` attributes on blocks.

#### Without wrapper selectors:

```typescript
import { Component } from '@angular/core';
import { PortableTextComponent, PortableTextComponents, PortableTextListItemComponent } from '@limitless-angular/sanity/portabletext';

@Component({
  selector: 'li[bullet]',
  standalone: true,
  template: `<ng-container #children />`,
  host: { 'style.list-style-type': '"disclosure-closed"' },
})
export class BulletListItemComponent extends PortableTextListItemComponent {}

@Component({
  selector: 'li[checkmarks]',
  standalone: true,
  template: `✅ <ng-container #children />`,
})
export class CheckmarksListItemComponent extends PortableTextListItemComponent {}

@Component({
  selector: 'app-your-component',
  template: ` <div portable-text [value]="portableTextValue" [components]="components"></div> `,
  standalone: true,
  imports: [PortableTextComponent],
})
export class YourComponent {
  portableTextValue = [
    /* array of portable text blocks */
  ];

  components: PortableTextComponents = {
    listItem: {
      bullet: BulletListItemComponent,
      checkmarks: CheckmarksListItemComponent,
    },
  };
}
```

#### With wrapper selectors:

```typescript
import { Component } from '@angular/core';
import { PortableTextComponent, PortableTextComponents, PortableTextListItemComponent } from '@limitless-angular/sanity/portabletext';

@Component({
  selector: 'app-bullet-list-item',
  standalone: true,
  template: `<li style="list-style-type: disclosure-closed"><ng-container #children /></li>`,
})
export class BulletListItemComponent extends PortableTextListItemComponent {}

@Component({
  selector: 'app-checkmarks-list-item',
  standalone: true,
  template: `<li>✅ <ng-container #children /></li>`,
})
export class CheckmarksListItemComponent extends PortableTextListItemComponent {}

@Component({
  selector: 'app-your-component',
  template: ` <div portable-text [value]="portableTextValue" [components]="components"></div> `,
  standalone: true,
  imports: [PortableTextComponent],
})
export class YourComponent {
  portableTextValue = [
    /* array of portable text blocks */
  ];

  components: PortableTextComponents = {
    listItem: {
      bullet: BulletListItemComponent,
      checkmarks: CheckmarksListItemComponent,
    },
  };
}
```

The `listItem` property can also be set to a single Angular component, which would handle list items of _any_ type.

### `hardBreak`

Component to use for rendering "hard breaks", eg `\n` inside of text spans.

Will by default render a `<br />`. Pass `false` to render as-is (`\n`)

## Typing Portable Text

Portable Text data can be typed using the `@portabletext/types` package.

### Basic usage

Use `PortableTextBlock` without generics for loosely typed defaults.

```typescript
import { PortableTextBlock } from '@portabletext/types';

interface MySanityDocument {
  portableTextField: (PortableTextBlock | SomeBlockType)[];
}
```

### Narrow types, marks, inline-blocks and lists

`PortableTextBlock` supports generics, and has the following signature:

```typescript
interface PortableTextBlock<M extends PortableTextMarkDefinition = PortableTextMarkDefinition, C extends TypedObject = ArbitraryTypedObject | PortableTextSpan, S extends string = PortableTextBlockStyle, L extends string = PortableTextListItemType> {}
```

Create your own, narrowed Portable text type:

```typescript
import { PortableTextBlock, PortableTextMarkDefinition, PortableTextSpan } from '@portabletext/types';

// MARKS
interface FirstMark extends PortableTextMarkDefinition {
  _type: 'firstMark';
  // ...other fields
}

interface SecondMark extends PortableTextMarkDefinition {
  _type: 'secondMark';
  // ...other fields
}

type CustomMarks = FirstMark | SecondMark;

// INLINE BLOCKS
interface MyInlineBlock {
  _type: 'myInlineBlock';
  // ...other fields
}

type InlineBlocks = PortableTextSpan | MyInlineBlock;

// STYLES
type TextStyles = 'normal' | 'h1' | 'myCustomStyle';

// LISTS
type ListStyles = 'bullet' | 'myCustomList';

// CUSTOM PORTABLE TEXT BLOCK
type CustomPortableTextBlock = PortableTextBlock<CustomMarks, InlineBlocks, TextStyles, ListStyles>;

// Other BLOCKS that can appear in between text
interface MyCustomBlock {
  _type: 'myCustomBlock';
  // ...other fields
}

// TYPE FOR PORTABLE TEXT FIELD ITEMS
type PortableTextFieldType = CustomPortableTextBlock | MyCustomBlock;

// Using it in your document type
interface MyDocumentType {
  portableTextField: PortableTextFieldType[];
}
```

## License

MIT © [Limitless Angular]

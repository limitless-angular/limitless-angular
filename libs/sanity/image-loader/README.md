# @limitless-angular/sanity/image-loader

[![npm version](https://img.shields.io/npm/v/@limitless-angular/sanity.svg)](https://www.npmjs.com/package/@limitless-angular/sanity)
[![npm downloads](https://img.shields.io/npm/dm/@limitless-angular/sanity.svg)](https://www.npmjs.com/package/@limitless-angular/sanity)

This secondary entry point provides two main features for working with Sanity images in Angular applications:

1. An Image Loader to optimize images using Sanity
2. A Sanity Image Directive for easy image rendering

## Demo

Check out our live demo of the Sanity example here: [Limitless Angular Sanity Example](https://limitless-angular-sanity-example.netlify.app/)

You can also see the example project in the monorepo: [`apps/sanity-example`](/apps/sanity-example)

## Table of Contents

- [Installation](#installation)
- [Image Loader](#image-loader)
  - [Basic Usage](#basic-usage)
- [Sanity Image Directive](#sanity-image-directive)
  - [Basic Usage](#basic-usage-1)
- [Integration with Portable Text](#integration-with-portable-text)
- [Advanced Usage](#advanced-usage)

## Installation

```bash
npm install --save @limitless-angular/sanity
```

## Image Loader

The Image Loader allows you to connect the NgOptimizedImage directive with Sanity to load images using the @sanity/image-url package.

### Basic Usage

```typescript
import { NgOptimizedImage } from '@angular/common';
import { provideSanityLoader } from '@limitless-angular/sanity/image-loader';

@Component({
  standalone: true,
  template: '<img ngSrc="image-id" width="100" height="100" />',
  imports: [NgOptimizedImage],
  providers: [
    provideSanityLoader({
      projectId: 'SANITY_PROJECT_ID',
      dataset: 'SANITY_DATASET',
    })
  ],
  // ...
})
export class YourComponent {}
```

## Sanity Image Directive

The `sanityImage` directive provides a convenient way to render Sanity images in your Angular components, especially when working with Portable Text content.

### Basic Usage

```typescript
import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  provideSanityLoader,
  SanityImage,
} from '@limitless-angular/sanity/image-loader';
import { PortableTextTypeComponent } from '@limitless-angular/sanity/portabletext';

@Component({
  selector: 'app-image',
  standalone: true,
  template: `<img width="100" height="100" [sanityImage]="value()" />`,
  imports: [SanityImage],
  providers: [provideSanityLoader({ projectId: 'SANITY_PROJECT_ID', dataset: 'SANITY_DATASET' })],
})
export class ImageComponent extends PortableTextTypeComponent {}
```

## Integration with Portable Text

The Sanity Image Directive can be easily integrated with the Portable Text implementation. Here's an example of how to use it within a custom image component for Portable Text:

```typescript
import { Component, computed } from '@angular/core';
import { PortableTextComponent, PortableTextComponents, PortableTextTypeComponent } from '@limitless-angular/sanity/portabletext';
import { SanityImage, provideSanityLoader } from '@limitless-angular/sanity/image-loader';
import { getImageDimensions } from '@sanity/asset-utils';

@Component({
  selector: 'app-portable-text-image',
  standalone: true,
  template: `
    <figure>
      <img [sanityImage]="value()" [width]="dimensions().width" [height]="dimensions().height" alt="" />
    </figure>
  `,
  imports: [SanityImage],
})
export class PortableTextImageComponent extends PortableTextTypeComponent {
  dimensions = computed(() => getImageDimensions(this.value()));
}

@Component({
  selector: 'app-your-component',
  template: `<div portable-text [value]="portableTextValue" [components]="components"></div>`,
  standalone: true,
  imports: [PortableTextComponent],
  providers: [provideSanityLoader({ projectId: 'SANITY_PROJECT_ID', dataset: 'SANITY_DATASET' })],
})
export class YourComponent {
  portableTextValue = [
    /* array of portable text blocks */
  ];

  components: PortableTextComponents = {
    types: {
      image: PortableTextImageComponent,
    },
  };
}
```

In this example:

- We pass the entire `value()` to the `sanityImage` directive, as it typically contains the necessary image information.
- We use the `getImageDimensions` utility from `@sanity/asset-utils` to calculate the image dimensions.

This setup allows you to use the `sanityImage` directive within your Portable Text content, providing seamless integration between your Sanity images and Portable Text blocks.

## Advanced Usage

For more advanced usage scenarios, such as customizing image transformations or handling different types of Sanity image objects, please refer to the [Sanity Image URL Builder documentation](https://www.sanity.io/docs/image-url).

You can extend the functionality of both the Image Loader and the Sanity Image Directive to suit your specific needs. For example, you might want to add custom error handling, lazy loading, or integrate with other Angular features.

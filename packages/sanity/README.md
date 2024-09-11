# @limitless-angular/sanity

This library provides Angular integrations for Sanity.io, enhancing your ability to work with Sanity content in Angular applications.

## Demo

Check out our example project in the monorepo: [`apps/sanity-example`](../../apps/sanity-example)

You can also see a live demo of the Sanity example here: [Limitless Angular Sanity Example](https://limitless-angular-sanity-example.netlify.app/)

## Table of Contents

- [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Portable Text](#portable-text)
  - [Image Loader](#image-loader)

## Getting Started

### Installation

```bash
npm install --save @limitless-angular/sanity
```

**Which Version to use?**

| Angular version | @limitless-angular/sanity |
| --------------- | ------------------------- |
| \>=18.0.0       | 18.x                      |

### Portable Text

A complete implementation for rendering [Portable Text](https://portabletext.org/) in Angular applications.

#### Basic Usage

```typescript
import { Component } from '@angular/core';
import { PortableTextComponent, PortableTextComponents } from '@limitless-angular/sanity/portabletext';

@Component({
  selector: 'app-your-component',
  template: `<div portable-text [value]="portableTextValue" [components]="customComponents"></div> `,
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

For more detailed information on using Portable Text, including styling, customizing components, and available components, please refer to the [Portable Text README](packages/sanity/portabletext/README.md).

### Image Loader

The image loader allows you to connect the NgOptimizedImage directive with Sanity to load images using the @sanity/image-url package.

#### Basic Usage

```typescript
import { NgOptimizedImage } from '@angular/common';
import { SanityImageLoader } from '@limitless-angular/sanity/image-loader';

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
```

For more details on the Image Loader, check out the [Image Loader README](packages/sanity/image-loader/README.md).

## Demo

Check out our example project in the monorepo: `apps/sanity-example`

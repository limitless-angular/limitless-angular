# Limitless Angular

[![Twitter Follow](https://img.shields.io/twitter/follow/osnoser1?style=social)](https://twitter.com/osnoser1)

Limitless Angular is a collection of powerful Angular libraries designed to enhance the Angular ecosystem and help developers build better applications with a focus on Sanity.io integration.

## Demo

Chout out our live demo of the Sanity example here: [Limitless Angular Sanity Example](https://limitless-angular-sanity-example.netlify.app/)

You can also see example project in the monorepo: [`apps/sanity-example`](/apps/sanity-example)

## Table of Contents

- [Libraries](#libraries)
- [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Usage](#usage)
  - [Portable Text](#portable-text)
  - [Image Loader](#image-loader)
- [Contributing](#contributing)
- [License](#license)
- [Roadmap](#roadmap)
- [Credits](#credits)
- [Support](#support)

## Libraries

### @limitless-angular/sanity

[![npm version](https://img.shields.io/npm/v/@limitless-angular/sanity.svg)](https://www.npmjs.com/package/@limitless-angular/sanity)
[![npm downloads](https://img.shields.io/npm/dm/@limitless-angular/sanity.svg)](https://www.npmjs.com/package/@limitless-angular/sanity)

This library provides two main features:

1. A complete Portable Text implementation for Angular
2. An image loader to optimize images using Sanity

## Getting Started

### Installation

```bash
npm install --save @limitless-angular/sanity
```

**Which Version to use?**

| Angular version | @limitless-angular/sanity |
| --------------- | ------------------------- |
| \>=18.0.0       | 18.x                      |

### Usage

- For Portable Text: `import { ... } from '@limitless-angular/sanity/portabletext';`
- For Image Loader: `import { ... } from '@limitless-angular/sanity/image-loader';`

For more detailed information, refer to the specific feature documentation:

- [Portable Text README](libs/sanity/portabletext/README.md)
- [Image Loader README](libs/sanity/image-loader/README.md)
- [Sanity Library Overview](libs/sanity/README.md)

### Portable Text

Render [Portable Text](https://portabletext.org/) with Angular.

#### Basic Usage

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

For more detailed information on using Portable Text, including styling, customizing components, and available components, please refer to the [Portable Text README](libs/sanity/portabletext/README.md).

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

For more details on the Image Loader, check out the [Image Loader README](libs/sanity/image-loader/README.md).

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for more details.

## Roadmap

We're constantly working to improve Limitless Angular. Here are some features we're planning:

- **Performance Optimizations**:

  - Enhance the efficiency and speed of the application to provide a smoother user experience.

- **Expanded Documentation and Examples**:

  - Develop comprehensive documentation and add more practical examples to help users understand and implement features more effectively.

- **Comprehensive Testing**:

  - Implement a full suite of tests to ensure code quality and reliability. This includes unit tests, integration tests, and end-to-end tests.

- **Lazy Loading of PortableText Components**:
  - Implement dynamic import to allow lazy loading of portable-text components, improving initial load times and overall performance by loading components only when needed.

Stay tuned for updates!

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/limitless-angular/limitless-angular/issues) on our GitHub repository.

## Credits

This repository is adapted from [@portabletext/react](https://github.com/portabletext/react-portabletext) which provided the vast majority of node rendering logic.

## License

This project is licensed under the MIT License. See our [LICENSE](LICENSE) file for details.

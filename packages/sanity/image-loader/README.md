# @limitless-angular/sanity/image-loader

[![npm version](https://img.shields.io/npm/v/@limitless-angular/sanity.svg)](https://www.npmjs.com/package/@limitless-angular/sanity)
[![npm downloads](https://img.shields.io/npm/dm/@limitless-angular/sanity.svg)](https://www.npmjs.com/package/@limitless-angular/sanity)

The `@limitless-angular/sanity/image-loader` package provides two powerful features for working with Sanity images in Angular applications:

1. **Image Loader**: Integrates with Angular's `NgOptimizedImage` directive to optimize Sanity images
2. **Sanity Image Directive**: A convenient directive for rendering Sanity images with automatic optimization

## Quick Start

1. Install the package:

```bash
npm install --save @limitless-angular/sanity
```

2. Configure in your `app.config.ts`:

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideSanity } from '@limitless-angular/sanity';

export const appConfig: ApplicationConfig = {
  providers: [
    provideSanity({
      projectId: 'your-project-id',
      dataset: 'your-dataset',
    }),
  ],
};
```

3. Use in your components:

```typescript
import { SanityImage } from '@limitless-angular/sanity/image-loader';

@Component({
  imports: [SanityImage],
  template: `<img [sanityImage]="imageRef" width="800" height="600" [alt]="imageRef.alt" />`,
})
export class ImageComponent {
  imageRef = {
    _type: 'image',
    asset: {
      _ref: 'image-Tb9Ew8CXIwaY6R1kjMvI0uRR-2000x3000-jpg',
    },
    alt: 'Sample image',
  };
}
```

## Features

### 1. Image Loader

- Integrates with `NgOptimizedImage`
- Automatic optimization and responsive sizing
- Format conversion support

```typescript
import { NgOptimizedImage } from '@angular/common';

@Component({
  imports: [NgOptimizedImage],
  template: `<img ngSrc="image-Tb9Ew8CXIwaY6R1kjMvI0uRR-2000x3000-jpg" width="100" height="100" />`,
})
export class ImageLoaderExample {}
```

### 2. Sanity Image Directive

- Simple API for rendering Sanity images
- Automatic optimization
- Supports all `NgOptimizedImage` features
- Additional Sanity-specific options

## Advanced Usage

### Portable Text Integration

```typescript
import { Component, computed } from '@angular/core';
import { PortableTextTypeComponent } from '@limitless-angular/sanity';
import { SanityImage } from '@limitless-angular/sanity/image-loader';
import { getImageDimensions } from '@sanity/asset-utils';

@Component({
  selector: 'app-portable-text-image',
  imports: [SanityImage],
  template: `<img [sanityImage]="value()" [width]="dimensions().width" [height]="dimensions().height" [alt]="value().alt" />`,
})
export class PortableTextImageComponent extends PortableTextTypeComponent {
  dimensions = computed(() => getImageDimensions(this.value()));
}
```

Usage in portable text component:

```typescript
import { Component, signal } from '@angular/core';
import { PortableTextComponent, PortableTextComponents } from '@limitless-angular/sanity/portabletext';

@Component({
  selector: 'app-portable-text',
  imports: [PortableTextComponent],
  template: `<div portable-text [value]="content" [components]="components"></div>`,
})
export class PortableTextExample {
  content = signal<any>([]);
  components: PortableTextComponents = {
    types: {
      image: PortableTextImageComponent,
    },
  };
}
```

### Visual Editing Support

```typescript
import { provideSanity, withLivePreview } from '@limitless-angular/sanity';
import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'your-project-id',
  dataset: 'your-dataset',
  apiVersion: 'YYYY-MM-DD',
  useCdn: true,
});

const getClientFactory = (preview?: { token: string }) =>
  preview?.token
    ? client.withConfig({
        token: preview.token,
        useCdn: false,
        ignoreBrowserTokenWarning: true,
        perspective: 'previewDrafts',
        stega: {
          enabled: true,
          studioUrl: 'your-studio-url',
        },
      })
    : client;

export const appConfig: ApplicationConfig = {
  providers: [provideSanity(getClientFactory, withLivePreview())],
};
```

### Image Transformations

```typescript
<img
  [sanityImage]="image"
  [loaderParams]="{ blur: 50, flip: 'horizontal' }"
  width="400"
  height="300"
/>
```

### Responsive Images

```typescript
<img
  [sanityImage]="image"
  width="800"
  height="600"
  sizes="(max-width: 768px) 100vw, 800px"
/>
```

## Available Options

### Sanity-Specific Inputs

- `[sanityImage]`: Sanity image reference (required)
- `[loaderParams]`: Transformation options
- `[quality]`: JPEG/WebP quality (0-100)

### Inherited from NgOptimizedImage

- `width`: Required width in pixels
- `height`: Required height in pixels
- `priority`: LCP image prioritization
- `fill`: Object-fit behavior
- `loading`: Loading behavior ('lazy'|'eager')
- `sizes`: Responsive sizing
- `disableOptimizedSrcset`: Disable automatic srcset

## Examples & Resources

- [Live Demo](https://limitless-angular-sanity-example.netlify.app/)
- [Example Source Code](https://github.com/limitless-angular/limitless-angular/tree/main/apps/sanity-example)
- [Sanity Image URL Builder docs](https://www.sanity.io/docs/image-url)
- [NgOptimizedImage docs](https://angular.io/api/common/NgOptimizedImage)

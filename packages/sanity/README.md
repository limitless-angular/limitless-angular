# Limitless Angular

[![Twitter Follow](https://img.shields.io/twitter/follow/osnoser1?style=social)](https://twitter.com/osnoser1)
[![npm version](https://img.shields.io/npm/v/@limitless-angular/sanity.svg)](https://www.npmjs.com/package/@limitless-angular/sanity)
[![npm downloads](https://img.shields.io/npm/dm/@limitless-angular/sanity.svg)](https://www.npmjs.com/package/@limitless-angular/sanity)

Limitless Angular is a powerful collection of Angular libraries focused on Sanity.io integration, designed to enhance your development experience with features like Portable Text rendering, image optimization, real-time previews, and visual editing.

## Quick Links

- 🚀 [Portable Text Live Demo](https://limitless-angular-sanity-example.netlify.app/)
- 💻 [Example Project](/apps/sanity-example)
- 📦 [NPM Package](https://www.npmjs.com/package/@limitless-angular/sanity)

## Features

- ✨ **Portable Text**: Complete implementation for rendering Sanity's Portable Text
- 🖼️ **Image Optimization**: Built-in image loader and directives for Sanity images
- 🔄 **Real-time Preview**: Live content updates with Preview Kit
- ✏️ **Visual Editing**: Seamless content management integration
- 🎯 **Angular-First**: Built specifically for Angular 18+

## Installation

```bash
npm install --save @limitless-angular/sanity
```

### Version Compatibility

| Angular version | Package version |
| --------------- | --------------- |
| ≥18.0.0         | 18.x            |

## Quick Start

### Basic Configuration

For image optimization features:

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

### Preview Kit & Visual Editing Configuration

For preview and visual editing features, use the client factory approach:

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

## Features

### Portable Text

Render [Portable Text](https://portabletext.org/) with Angular.

```typescript
@Component({
  standalone: true,
  imports: [PortableTextComponent],
  template: `<div portable-text [value]="content" [components]="components"></div>`,
})
export class ContentComponent {
  content = [
    /* your portable text content */
  ];
  components: PortableTextComponents = {
    // Custom components configuration
  };
}
```

[📚 Portable Text Documentation](packages/sanity/portabletext/README.md)

### Image Handling

Powerful features for working with Sanity images in Angular applications:

```typescript
@Component({
  standalone: true,
  imports: [SanityImage],
  template: `
    <img
      [sanityImage]="imageRef"
      width="800"
      height="600"
      [alt]="imageRef.alt"
    />
  `,
})
```

[📚 Image Loader Documentation](packages/sanity/image-loader/README.md)

### Preview Kit

The Preview Kit provides real-time preview capabilities for
Sanity content in Angular applications, enabling live updates
of content as it's being edited in the Sanity Studio:

```typescript
import { LiveQueryProviderComponent } from '@limitless-angular/sanity/preview-kit';

@Component({
  standalone: true,
  imports: [LiveQueryProviderComponent],
  template: `
    @if (draftMode()) {
      <live-query-provider [token]="token">
        <router-outlet />
      </live-query-provider>
    } @else {
      <router-outlet />
    }
  `,
})
export class AppComponent {
  draftMode = signal(false);
  token = signal('your-preview-token');
}
```

[📚 Preview Kit Documentation](packages/sanity/preview-kit/README.md)

### Visual Editing

The Visual Editing feature allows editors to click elements in
your preview to navigate directly to the corresponding
document and field in Sanity Studio.

```typescript
@Component({
  standalone: true,
  imports: [VisualEditingComponent],
  template: `
    <main>
      <router-outlet />
      @if (draftMode()) {
        <visual-editing />
      }
    </main>
  `,
})
export class AppComponent {}
```

[📚 Visual Editing Documentation](packages/sanity/visual-editing/README.md)

## Roadmap

- 🎯 Performance optimizations
- 📚 Enhanced documentation and examples
- ✅ Comprehensive test coverage
- 🔄 Lazy loading for Portable Text components

## Contributing

We welcome contributions! Check our [Contributing Guide](CONTRIBUTING.md) for details.

## Support

- 🐛 [Report Issues](https://github.com/limitless-angular/limitless-angular/issues)
- 💬 [Discussions](https://github.com/limitless-angular/limitless-angular/discussions)

## Credits

Adapted from [@portabletext/react](https://github.com/portabletext/react-portabletext) which provided the
vast majority of node rendering logic.

## License

This project is licensed under the MIT License. See our [LICENSE](LICENSE) file for details.

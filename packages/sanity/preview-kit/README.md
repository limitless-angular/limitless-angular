# @limitless-angular/sanity/preview-kit

[![npm version](https://img.shields.io/npm/v/@limitless-angular/sanity.svg)](https://www.npmjs.com/package/@limitless-angular/sanity)
[![npm downloads](https://img.shields.io/npm/dm/@limitless-angular/sanity.svg)](https://www.npmjs.com/package/@limitless-angular/sanity)

Secondary entry point of `@limitless-angular/sanity`. It can be used by importing from `@limitless-angular/sanity/preview-kit`.

Based on [Preview Kit v5.1.0](https://github.com/sanity-io/preview-kit/blob/main/packages/preview-kit/CHANGELOG.md#510-2024-05-30)

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Basic Setup](#basic-setup)
- [Draft Mode Pattern](#draft-mode-pattern)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Integration with Visual Editing](#integration-with-visual-editing)
- [Notes](#notes)

## Overview

The preview-kit provides real-time preview capabilities for Sanity content in Angular applications. It enables live updates of content as it's being edited in the Sanity Studio.

## Installation

The preview-kit is included with `@limitless-angular/sanity`. Install the main package:

```bash
npm install @limitless-angular/sanity
```

## Basic Setup

1. Configure your Sanity client:

```typescript
import { provideSanity, withLivePreview } from '@limitless-angular/sanity';

const client = createClient({
  projectId: 'your-project-id',
  dataset: 'your-dataset',
  apiVersion: 'YYYY-MM-DD',
  useCdn: true,
  perspective: 'published',
});

const getClientFactory: SanityClientFactory = (preview?: { token: string }) => {
  if (preview?.token) {
    return client.withConfig({
      token: preview.token,
      useCdn: false,
      ignoreBrowserTokenWarning: true,
      perspective: 'previewDrafts',
      stega: {
        enabled: !!preview?.token,
        studioUrl: 'your-studio-url',
      },
    });
  }

  return client;
};

export const appConfig: ApplicationConfig = {
  providers: [provideSanity(getClientFactory, withLivePreview())],
};
```

2. Add the `LiveQueryProviderComponent` to your app's template where you want to enable live preview:

```typescript
import { LiveQueryProviderComponent } from '@limitless-angular/sanity/preview-kit';

@Component({
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

## Draft Mode Pattern

When implementing preview functionality, you typically want to conditionally render either the preview or the regular component based on draft mode. Here's the recommended pattern:

### Server-side Data Resolution

It's crucial to resolve the data server-side before rendering the component. This ensures:

1. The draft mode status is determined server-side
2. The preview token is only sent to the client when draft mode is enabled
3. The component has all required data before rendering

Example of a server-side api endpoint (using [Analog][analog]):

```typescript
export const load = async ({ event }: PageServerLoad) => {
  const draftMode = isDraftMode(event);
  const client = getClientFactory(draftMode ? { token: readToken } : undefined);
  const [post, settings, morePosts] = await Promise.all([getPostBySlug(client, params['slug']), getSettings(client), getMoreStories(client, params['slug'], 2)]);
  return {
    post,
    settings,
    morePosts,
    draftMode,
    token: draftMode ? readToken : '', // Only send token when draft mode is enabled
  };
};
export type LoadResult = Awaited<ReturnType<typeof load>>;
```

### Component Implementation

Your page component should use the resolved data:

```typescript:pages/posts/[slug].page.ts
@Component({
  template: `
    @if (draftMode()) {
      <blog-preview-post-page [slug]="slug()" [data]="load()" />
    } @else {
      <blog-post-page [slug]="slug()" [data]="load()" />
    }
  `,
  imports: [PreviewPostPageComponent, PostPageComponent],
})
export default class PostPage {
  slug = input.required<string>();
  load = input.required<LoadResult>();
  draftMode = computed(() => this.load().draftMode);
}
```

The preview component (`PreviewPostPageComponent`) uses `createLiveData` to enable real-time updates:

```typescript
interface LoadResult {
  post: {
    title: string;
    slug: string;
    content: any[];
  };
  settings: {
    title: string;
    description: any[];
  };
  morePosts: any[];
  draftMode: boolean; // Used to determine whether to show preview
}

@Component({
  selector: 'blog-preview-post-page',
  template: `<blog-post-page [slug]="slug()" [data]="liveData()" />`,
})
export class PreviewPostPageComponent {
  slug = input.required<string>();
  data = input.required<LoadResult>();

  liveData = createLiveData(this.data, () => ({
    post: {
      query: postQuery,
      params: { slug: this.slug() },
    },
    settings: { query: settingsQuery },
    morePosts: {
      query: moreStoriesQuery,
      params: { skip: this.slug(), limit: 2 },
    },
  }));
}
```

This pattern ensures that:

1. Data is always resolved server-side before component rendering
2. The preview token is only exposed to the client when draft mode is active
3. Live preview is only active when in draft mode
4. Regular users see the published content
5. The preview component handles real-time updates through `createLiveData`
6. Type safety is maintained through the `LoadResult` interface

## Configuration

### Live Preview Refresh Interval

You can configure the refresh interval using the `withLivePreview` feature in your providers:

```typescript
import { provideSanity, withLivePreview } from '@limitless-angular/sanity';

@NgModule({
  providers: [
    provideSanity(
      yourSanityFactory,
      withLivePreview({ refreshInterval: 5000 }), // Default is 10000ms
    ),
  ],
})
export class AppModule {}
```

## API Reference

### LiveQueryProviderComponent

A component that provides the live preview context to its children.

**Inputs:**

- `token: string` - The Sanity preview token (required)

### createLiveData

A utility function that creates a signal for live-updating data.

```typescript
function createLiveData<T>(
  initialData: () => T,
  queries: () => {
    [K in keyof T]?: {
      query: string;
      params?: Record<string, unknown>;
    };
  },
): Signal<T>;
```

**Parameters:**

- `initialData`: Function returning the initial data state
- `queries`: Function returning an object mapping data keys to their respective queries and parameters

**Returns:**

- A signal that updates automatically when the underlying data changes in Sanity

## Integration with Visual Editing

- The preview-kit provides real-time preview capabilities for Sanity content in Angular applications. It enables live updates of content as it's being edited in the Sanity Studio.

## Notes

- The preview-kit requires a valid Sanity preview token to function
- Live updates only work in browser environments
- Cross-dataset references are not currently supported

[analog]: https://analogjs.org/

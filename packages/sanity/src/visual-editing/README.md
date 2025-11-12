# @limitless-angular/sanity/visual-editing

[![npm version](https://img.shields.io/npm/v/@limitless-angular/sanity.svg)](https://www.npmjs.com/package/@limitless-angular/sanity)
[![npm downloads](https://img.shields.io/npm/dm/@limitless-angular/sanity.svg)](https://www.npmjs.com/package/@limitless-angular/sanity)

Based on [Visual Editing v2.1.9](https://github.com/sanity-io/visual-editing/blob/main/packages/visual-editing/CHANGELOG.md#219-2024-08-12) and [Next Sanity 9.8.13](https://github.com/sanity-io/next-sanity/blob/main/packages/next-sanity/CHANGELOG.md#9813-2024-11-13)

This secondary entry point is used to create clickable elements to take editors right from previews to the document and field they want to edit.

## Table of Contents

- [Installation](#installation)
- [Importing the Component](#importing-the-component)
- [Basic Usage](#basic-usage)
- [Component Properties](#component-properties)

## Installation

First, ensure you have installed the `@limitless-angular/sanity` package in your Angular project:

```bash
npm install @limitless-angular/sanity
```

## Importing the Component

To use the Visual Editing component, import it in your Angular module or component file:

```typescript
import { VisualEditingComponent } from '@limitless-angular/sanity/visual-editing';
```

## Basic Usage

Add the `<visual-editing />` component to your template, typically at the root level of your application or on pages where you want to enable visual editing:

```typescript
@Component({
  imports: [VisualEditingComponent],
  template: `
    <main>
      <router-outlet />
    </main>
    @if (draftMode()) {
      <visual-editing />
    }
  `,
})
export default class AppComponent {}
```

In this example, the `<visual-editing />` component is conditionally rendered based on whether the application is in draft mode.

## Component Properties

The `VisualEditingComponent` accepts several input properties:

1. `refresh`: A function to refresh the content when changes are made.

2. `zIndex`: A number to set the z-index of the visual editing overlay.

3. `basePath`: A string to set the base path for routing (optional).

4. `trailingSlash`: A boolean to indicate if URLs should include a trailing slash (optional).

## Configuration

The component attempts to auto-detect some configuration settings, but you can manually set them if needed:

```html
<visual-editing [refresh]="yourRefreshFunction" [zIndex]="1000" basePath="/your-base-path" [trailingSlash]="true" />
```

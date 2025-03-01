# Portable Text Architecture

This document provides a detailed architectural overview of the Portable Text implementation for Angular. It's intended for developers who want to understand the internal workings of the library, contribute to its development, or extend its functionality.

## Overview

The portable-text implementation is an Angular component library for rendering structured content following the Portable Text specification. It provides a flexible and customizable way to render rich text content with support for various block types, marks, lists, and custom components.

## Architecture

### Core Components

1. **PortableTextComponent**: The main entry point that orchestrates the rendering of portable text blocks. It uses a recursive approach to render nested structures.

2. **Block Components**:
   - **BlockComponent**: Renders block-level elements like paragraphs, headings, etc.
   - **ListComponent**: Renders list containers (ul/ol)
   - **ListItemComponent**: Renders list items (li)
   - **SpanComponent**: Renders text spans with marks (bold, italic, links, etc.)
   - **TextComponent**: Renders plain text nodes
   - **ChildrenComponent**: Manages rendering of child nodes

### Directives

1. **RenderNode**: A directive that handles the rendering of individual nodes in the portable text tree
2. **PortableTextDirectives**: A set of directives that define the component interfaces for different node types:
   - PortableTextTypeComponent
   - PortableTextMarkComponent
   - PortableTextBlockComponent
   - PortableTextListComponent
   - PortableTextListItemComponent

### Default Components

The library provides default implementations for common elements:

- Default block styles (normal, h1-h6, blockquote)
- Default marks (bold, italic, underline, etc.)
- Default list types (bullet, number)
- Unknown component handlers for graceful fallbacks

## Key Features

1. **Component Customization**: The library allows overriding any component through the `componentOverrides` input, enabling complete customization of rendering.

2. **Recursive Rendering**: The implementation uses a recursive approach to render nested structures like lists and marks.

3. **Modern Angular Features**:

   - Uses Angular signals (`computed()`, `input()`)
   - Standalone components
   - Template-based rendering with the new control flow syntax (`@if`, `@for`)
   - Dependency injection for component communication

4. **Error Handling**: Provides graceful fallbacks for unknown components with customizable warning handlers.

5. **Performance Optimizations**:
   - Memoization for expensive operations
   - OnPush change detection
   - Efficient tracking with `trackBy`

## Implementation Details

### Data Flow

1. The `value` input accepts Portable Text blocks
2. Blocks are processed and nested lists are created
3. Each node is rendered based on its type using the appropriate component

### Component Resolution

1. Components are resolved based on node type and style
2. Custom components can be provided through the `componentOverrides` input
3. Default components are used as fallbacks

### Template References

1. Each component exposes its template through a `template()` method
2. Templates are composed together to create the final output

### Dependency Injection

1. Components communicate through dependency injection
2. The `MISSING_COMPONENT_HANDLER` token allows customizing error handling

## Integration with External Libraries

The implementation relies on two external libraries:

1. **@portabletext/toolkit**: Provides utilities for working with Portable Text (building marks tree, nesting lists, etc.)
2. **@portabletext/types**: Provides TypeScript types for Portable Text structures

## Modern Angular Patterns

The implementation showcases several modern Angular patterns:

1. **Signals**: Used for reactive state management
2. **Standalone Components**: All components are standalone
3. **Template References**: Used for dynamic template composition
4. **Dependency Injection**: Used for component communication
5. **OnPush Change Detection**: Used for performance optimization

## Code Organization

### Main Components

- `portable-text.component.ts`: The main component that orchestrates rendering
- `block.component.ts`: Renders block-level elements
- `list.component.ts`: Renders list containers
- `list-item.component.ts`: Renders list items
- `span.component.ts`: Renders text spans with marks
- `text.component.ts`: Renders plain text nodes
- `children.component.ts`: Manages rendering of child nodes

### Utilities

- `merge.ts`: Merges default and custom components
- `utils.ts`: Provides utility functions for serializing blocks and tracking

### Types and Tokens

- `types.ts`: Defines TypeScript interfaces for the library
- `tokens.ts`: Defines dependency injection tokens

### Default Components

- `defaults/default-components.ts`: Configures default components
- `defaults/blocks.ts`: Default block components
- `defaults/marks.ts`: Default mark components
- `defaults/list.ts`: Default list components
- `defaults/unknown.ts`: Fallback components for unknown types

## Rendering Process

1. The `PortableTextComponent` receives Portable Text blocks through the `value` input
2. The blocks are processed and nested lists are created using `nestLists` from `@portabletext/toolkit`
3. Each block is rendered recursively based on its type:
   - Blocks are rendered using the appropriate block component
   - Lists are rendered using the list component
   - List items are rendered using the list item component
   - Spans are rendered using the span component
   - Text nodes are rendered using the text component
4. Custom components can be provided through the `componentOverrides` input
5. If a component is not found, a warning is displayed and a fallback component is used

## Customization Points

The library provides several customization points:

1. **Component Overrides**: Custom components can be provided for any node type
2. **Missing Component Handler**: Custom error handling for missing components
3. **Custom Styling**: Components can be styled using CSS

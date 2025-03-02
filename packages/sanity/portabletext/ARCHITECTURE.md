# Portable Text Architecture

This document provides a detailed architectural overview of the Portable Text implementation for Angular. It's intended for developers who want to understand the internal workings of the library, contribute to its development, or extend its functionality.

## Overview

The portable-text implementation is an Angular component library for rendering structured content following the Portable Text specification. It provides a flexible and customizable way to render rich text content with support for various block types, marks, lists, and custom components.

## Architecture

### Core Components

1. **PortableTextComponent**: The main entry point that orchestrates the rendering of portable text blocks. It uses a recursive approach to render nested structures.

2. **Supporting Components**:
   - **TextComponent**: Renders plain text nodes with special handling for line breaks
   - **NodeRendererComponent**: A generic component that dynamically renders different node types
   - **ChildrenComponent**: Manages rendering of child nodes

### Handler Services

1. **NodeResolverService**: Central service that determines the appropriate template and context for each node type
2. **BlockHandlerService**: Handles block-level elements like paragraphs, headings, etc.
3. **ListHandlerService**: Handles list containers (ul/ol)
4. **ListItemHandlerService**: Handles list items (li)
5. **SpanHandlerService**: Handles text spans with marks (bold, italic, links, etc.)

### Directives

1. **RenderNode**: A directive that handles the rendering of individual nodes in the portable text tree

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
3. Each node is resolved to a template and context by the `NodeResolverService`
4. Nodes are rendered using the appropriate template and context

### Component Resolution

1. The `NodeResolverService` determines the appropriate component type for each node
2. Handler services provide the component type and input properties for their respective node types
3. Custom components can be provided through the `componentOverrides` input
4. Default components are used as fallbacks

### Template Selection

1. The `NodeResolverService` selects the appropriate template for each node type
2. Text nodes use the specialized `TextComponent` template
3. All other node types use the `NodeRendererComponent` template

### Dependency Injection

1. Components and services communicate through dependency injection
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
- `text.component.ts`: Renders plain text nodes
- `node-renderer.component.ts`: Generic component for rendering different node types
- `children.component.ts`: Manages rendering of child nodes

### Handler Services

- `node-resolver.service.ts`: Central service for resolving nodes to templates and contexts
- `block-handler.service.ts`: Handles block-level elements
- `list-handler.service.ts`: Handles list containers
- `list-item-handler.service.ts`: Handles list items
- `span-handler.service.ts`: Handles text spans with marks

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

## Node Rendering Process

The Portable Text implementation uses a streamlined approach to render different node types:

1. **Node Resolution**: The `NodeResolverService` is the central coordinator that:

   - Takes a node, components, templates, and other parameters
   - Delegates to the appropriate handler service based on node type
   - Returns an object with `template` and `context` properties

2. **Handler Services**: Each handler service is responsible for:

   - Determining the appropriate component type for its node type
   - Creating the input properties for the component
   - Providing this information back to the `NodeResolverService`

3. **Template Selection**: The `NodeResolverService` selects between different templates:

   - Text nodes use the specialized `TextComponent` template
   - All other node types use the `NodeRendererComponent` template

4. **Context Creation**: The service creates the appropriate context for each template:

   - For text nodes, it provides the node as the implicit context variable
   - For other nodes, it provides the component type and input properties

5. **Rendering**: The `PortableTextComponent` uses the template and context from the `NodeResolverService` to render the node using Angular's `ngTemplateOutlet` directive.

This architecture provides several benefits:

- **Clear Separation of Concerns**: Each service has a specific responsibility
- **Centralized Logic**: Node resolution logic is centralized in the `NodeResolverService`
- **Reduced Complexity**: Fewer components means simpler code and better performance
- **Flexibility**: Easy to add support for new node types or customize existing ones
- **Maintainability**: Clear boundaries between components and services

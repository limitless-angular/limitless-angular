# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Limitless Angular is a monorepo containing Angular libraries for Sanity.io integration. The primary package is `@limitless-angular/sanity`, which provides Portable Text rendering, image optimization, real-time previews, and visual editing capabilities.

## Development Commands

This project uses Turborepo for build orchestration and pnpm for package management.

### Core Commands
- `pnpm dev` - Start development servers for all apps
- `pnpm build` - Build all packages and apps  
- `pnpm test` - Run tests across all packages
- `pnpm lint` - Run ESLint on all packages
- `pnpm format:write` - Format code with Prettier

### Package-specific Commands
- `turbo run build --filter=sanity` - Build only the sanity package
- `turbo run test --filter=sanity-example` - Run tests for the example app
- `turbo run dev --filter=sanity-example` - Start only the example app

### Single Test Execution
- `cd packages/sanity && pnpm vitest --run <test-file>` - Run a single test file
- `cd apps/sanity-example && pnpm test` - Run example app tests

## Architecture

### Monorepo Structure
```
├── packages/
│   └── sanity/                 # Main library package
│       ├── src/                # Core library exports and providers
│       ├── portabletext/       # Portable Text rendering components
│       ├── image-loader/       # Sanity image optimization
│       ├── preview-kit/        # Real-time preview functionality
│       ├── visual-editing/     # Visual editing integration
│       └── shared/             # Shared utilities and types
├── apps/
│   ├── sanity-example/         # Demo application
│   ├── analog-sanity-blog-example/  # Blog example with Analog
│   └── sanity-studio/          # Sanity Studio configuration
└── tools/                      # Build and development tools
```

### Key Library Features

#### 1. Portable Text (`packages/sanity/portabletext/`)
- Angular components for rendering Sanity's Portable Text format
- Customizable component mapping system
- Built on `@portabletext/toolkit` for consistency with other frameworks

#### 2. Image Loader (`packages/sanity/image-loader/`)
- Optimized image loading with Sanity's image API
- Directive-based approach for easy integration
- Automatic image URL generation and optimization

#### 3. Preview Kit (`packages/sanity/preview-kit/`)
- Real-time content updates using Sanity's Preview Kit
- Live query provider for seamless preview experiences
- Integration with Sanity's draft content system

#### 4. Visual Editing (`packages/sanity/visual-editing/`)
- Click-to-edit functionality in preview mode
- Direct navigation from preview to Sanity Studio
- Stega-encoded content for precise field mapping

### Provider System
The library uses a feature-based provider system:
- `provideSanity()` - Core configuration provider
- `withLivePreview()` - Enables real-time preview features
- Supports both simple config objects and client factory functions

### Testing Strategy
- Vitest for unit testing with Angular support via `@analogjs/vitest-angular`
- Testing configuration in `vitest.config.mts` files
- Component testing with Angular Testing Library

## Development Guidelines

### Library Development
- All new features should be added as separate sub-packages within `packages/sanity/`
- Use the established provider pattern for feature registration
- Maintain peer dependency compatibility with Angular 18+ and 19+
- Follow the existing directory structure with separate folders for each feature

### Version Compatibility
- Angular 18+ and 19+ support
- Node.js >= 20.12 required
- pnpm >= 9.11 required

### Build System
- Uses Turborepo for task orchestration and caching
- Angular CLI builders for application builds
- ng-packagr for library packaging
- ESLint with Angular-specific rules and Prettier for formatting

### Example Applications
When working with example apps:
- `sanity-example`: Demonstrates core library features with SSR support
- `analog-sanity-blog-example`: Shows integration with Analog framework
- Both apps use Angular 19 with standalone components

### Migration Context
This project was recently migrated from Nx to Turborepo. Some legacy Nx configuration files may still exist (`project.json` files) but are now used by Turborepo for project detection.
# Repository Guidelines

## Project Structure & Module Organization

This is a pnpm/Turbo monorepo for Limitless Angular. The main package is `packages/sanity`, with secondary Angular library entry points in `packages/sanity/image-loader`, `packages/sanity/portabletext`, `packages/sanity/preview-kit`, `packages/sanity/shared`, and `packages/sanity/visual-editing`; each exposes public API through `src/index.ts` and `ng-package.json`. Example and integration apps live in `apps/`, including `sanity-example`, `analog-sanity-blog-example`, Studio apps, and `sanity-presentation-e2e`. Release and Angular compatibility automation live in `tools/`. Root config includes `turbo.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, and `eslint.config.js`.

## Build, Test, and Development Commands

- `nvm use && pnpm install`: use Node `24.17.0` and install workspace dependencies.
- `pnpm build`: run Turbo builds across packages and apps.
- `pnpm lint`: run ESLint for all configured workspaces.
- `pnpm test`: run workspace tests, including Vitest package specs.
- `pnpm --filter @limitless-angular/sanity test`: run only the main package tests.
- `pnpm --filter sanity-example serve`: start the basic Angular example app.
- `pnpm blog:dev`: start the Analog blog example and matching Studio workflow.
- `pnpm --filter sanity-presentation-e2e e2e`: run Playwright presentation tests.

## Coding Style & Naming Conventions

Use TypeScript ESM and existing Angular conventions: `*.component.ts`, `*.service.ts`, `*.directive.ts`, and `*.spec.ts`. Keep public exports intentional through each entry point’s `src/index.ts`. Formatting follows `.editorconfig` and Prettier: 2-space indentation, UTF-8, final newline, trimmed trailing whitespace, and single quotes. ESLint uses TypeScript ESLint plus Prettier; unused variables may be prefixed with `_`, while `any` and non-null assertions should be avoided or justified.

## Testing Guidelines

Package tests use Vitest with Angular and `jsdom`; specs are discovered as `**/*.spec.ts` under `packages/sanity`. E2E coverage uses Playwright specs in `apps/sanity-presentation-e2e/tests`. Add tests beside affected package code when changing rendering, live preview, image loading, or compatibility behavior. Run `pnpm test` and the relevant filtered command before opening a PR; run Playwright when presentation or Studio integration changes.

## Commit & Pull Request Guidelines

Follow Conventional Commits from `CONTRIBUTING.md`: `feat(scope): add thing`, `fix(sanity): handle case`, `test: cover behavior`, `ci(release): update workflow`. Use imperative, lowercase subjects without a trailing period; keep lines under 100 characters. PRs should rebase on current `main`, link issues with `Closes #...` when applicable, describe the new behavior, call out breaking changes and migration notes, and include screenshots only for visible UI changes.

## Security & Configuration Tips

Do not commit secrets. Use the checked-in `.env.local.example` files for app setup, and keep local Sanity tokens or Playwright auth state out of changes unless a test fixture explicitly requires them.

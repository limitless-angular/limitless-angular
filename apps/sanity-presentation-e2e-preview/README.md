# Sanity Presentation E2E Preview

Minimal Angular SSR preview fixture for `apps/sanity-presentation-e2e`.

The app exposes `/presentation-smoke` and small local API endpoints used by the
Sanity Presentation smoke tests. It intentionally stays separate from the blog
example so hermetic Studio tests do not depend on blog routes or blog data.

## Development

Run:

```sh
pnpm --dir apps/sanity-presentation-e2e-preview run serve
```

Then open `http://localhost:4200/presentation-smoke`.

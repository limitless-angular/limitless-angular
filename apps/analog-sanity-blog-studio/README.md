# Analog Sanity Blog Studio

This is the first-class Sanity Studio for the Analog blog example. It consumes
the source-only `@limitless-angular/analog-sanity-blog` package for schema,
Presentation routing, and Studio structure.

## Local Setup

Set the frontend app env in `apps/analog-sanity-blog-example/.env.local`:

```dotenv
VITE_SANITY_PROJECT_ID=your-project-id
VITE_SANITY_DATASET=production
VITE_SANITY_STUDIO_URL=http://localhost:3333
SANITY_API_READ_TOKEN=your-read-token
BYPASS_TOKEN=local-bypass-token
```

Set the Studio env in `apps/analog-sanity-blog-studio/.env.local`:

```dotenv
SANITY_STUDIO_PROJECT_ID=your-project-id
SANITY_STUDIO_DATASET=production
SANITY_STUDIO_PREVIEW_ORIGIN=http://localhost:4200
SANITY_STUDIO_ORIGIN=http://localhost:3333
SANITY_STUDIO_WRITE_TOKEN=your-write-token
```

`SANITY_STUDIO_WRITE_TOKEN` is optional if you are logged into the Sanity CLI,
but it is useful for non-interactive seeding.

Then log in and configure the project once:

```bash
pnpm --filter=analog-sanity-blog-studio exec sanity login
pnpm blog:setup
```

Run the Studio and Analog preview together:

```bash
pnpm blog:dev
```

Open `http://localhost:3333/presentation` to edit the blog through Sanity
Presentation.

## Type Generation

After changing schema or GROQ queries, regenerate the frontend Sanity types:

```bash
pnpm blog:typegen
```

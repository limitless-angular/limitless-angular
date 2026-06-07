# Sanity Presentation E2E

This harness verifies that the Angular preview libraries still work when the app is embedded like Sanity Studio Presentation embeds it.

## Fast Protocol Smoke

```bash
pnpm turbo run e2e --filter=sanity-presentation-e2e
```

This starts the Analog example app with dummy Sanity env values, then uses a fake Presentation host to:

- open `/presentation-smoke` inside an iframe
- complete the legacy `sanity/channels` handshake
- assert `@limitless-angular/sanity/preview-kit` posts `preview-kit/documents`
- assert live preview refreshes Angular data without reloading the iframe
- assert `@limitless-angular/sanity/visual-editing` connects to the host
- assert the editable title renders the expected `data-sanity` marker

## Hermetic Studio Smoke

```bash
pnpm turbo run e2e-studio --filter=sanity-presentation-e2e
```

This starts the real Sanity Studio fixture, but keeps the Sanity backend and smoke route hermetic:

- Studio uses the dummy `presentation-smoke-project`
- the test mocks browser requests to that dummy Sanity API
- the smoke route uses a controlled fake Sanity client
- the Analog app uses a test-only draft-mode bypass
- the rendered preview exposes the expected editable `data-sanity` marker

Use this for CI or Angular/Sanity dependency updates when you want the real Studio shell without relying on a real Sanity project.

## CI Coverage

The main CI workflow runs these automatically on pull requests and pushes to `main` only when related paths are affected:

```bash
pnpm turbo run e2e --filter=sanity-presentation-e2e
pnpm turbo run e2e-studio --filter=sanity-presentation-e2e
```

The related path gate includes `apps/analog-sanity-blog-example`, `apps/sanity-presentation-e2e`, `apps/sanity-presentation-e2e-studio`, and `packages/sanity`. Changes to root workspace config or `.github/workflows/ci.yml` also run the checks because they can change this gate.

The real-project Studio smoke runs for manual workflow dispatches with `run_real_studio` enabled, or for affected pushes to `main`. Configure these GitHub Actions secrets to enable it:

```text
SANITY_E2E_PROJECT_ID
SANITY_E2E_DATASET
SANITY_E2E_READ_TOKEN
SANITY_E2E_BYPASS_TOKEN
SANITY_E2E_STORAGE_STATE_JSON
SANITY_E2E_WRITE_TOKEN
```

`SANITY_E2E_WRITE_TOKEN` is optional. When present, CI seeds `presentation-smoke-post` and runs the real live-update mutation test. Without it, CI expects the real `presentation-smoke-post` document to already exist and skips the mutation test.

## Real Project Studio Smoke

```bash
pnpm turbo run e2e-real-studio --filter=sanity-presentation-e2e
```

This starts the same Studio fixture without Sanity API mocks, without the draft-mode bypass, and with the smoke route using the app's real Sanity client. This target is the "everything real" path: real Studio host, real app route, real Sanity client, real project, and no fake Presentation host.

The real-project smoke asserts that:

- Studio Presentation opens the Angular `/presentation-smoke` preview frame
- the preview route renders data loaded by the app's real Sanity client
- `@limitless-angular/sanity/preview-kit` announces the real document in use to Studio
- `@limitless-angular/sanity/visual-editing` connects to Studio and exposes an editable `data-sanity` marker
- when `SANITY_API_WRITE_TOKEN` is set in the shell, CI env, or one of the `.env.local` files below, a real Sanity mutation updates the Angular live preview without reloading the iframe, then restores the title; that token must have document update permission for the configured project and dataset

It uses real project env with shell or CI variables taking precedence over local files:

1. `apps/analog-sanity-blog-example/.env.local`
2. `apps/sanity-presentation-e2e/.env.local`
3. shell or CI environment variables

At minimum, set these in `apps/analog-sanity-blog-example/.env.local` or your shell:

```dotenv
VITE_SANITY_PROJECT_ID=your-project-id
VITE_SANITY_DATASET=your-dataset
SANITY_API_READ_TOKEN=your-read-token
BYPASS_TOKEN=local-bypass-token
```

To enable the real live-update mutation test, also set a token with document update permission in `apps/analog-sanity-blog-example/.env.local`, `apps/sanity-presentation-e2e/.env.local`, or your shell/CI env:

```dotenv
SANITY_API_WRITE_TOKEN=your-write-token
```

Without `SANITY_API_WRITE_TOKEN`, the mutation test is skipped and the non-destructive real Studio smoke still runs. If the token is present but cannot update documents, the mutation test fails because the real live-update proof did not run.

The fake Presentation host tests intentionally stay in `pnpm turbo run e2e --filter=sanity-presentation-e2e`. There is no real-project "all" target that mixes fake-host coverage with real Studio coverage.

If the Studio should use different names than the app env, set these in `apps/sanity-presentation-e2e/.env.local` or the shell:

```dotenv
SANITY_STUDIO_PROJECT_ID=your-project-id
SANITY_STUDIO_DATASET=your-dataset
```

### One-time local project setup

Log into the Sanity CLI with a user that can manage the project:

```bash
pnpm --dir=apps/sanity-presentation-e2e-studio sanity login
```

Allow the local Studio fixture origin to call the Sanity API with credentials:

```bash
node apps/sanity-presentation-e2e/scripts/sanity-cors.mjs add
```

This command is safe to rerun; if the origin already exists, it exits successfully.

You can confirm it is present with:

```bash
node apps/sanity-presentation-e2e/scripts/sanity-cors.mjs list
```

The helper reads the same `.env.local` files above, maps `SANITY_STUDIO_PROJECT_ID` from `VITE_SANITY_PROJECT_ID` and `SANITY_STUDIO_DATASET` from `VITE_SANITY_DATASET` when needed, and keeps shell or CI variables as the final override.

Seed the real project with the smoke document if it does not already exist:

```bash
node apps/sanity-presentation-e2e/scripts/sanity-seed-post.mjs
```

The seed helper creates a real `post` document with `_id: presentation-smoke-post`. It uses `SANITY_API_WRITE_TOKEN` when available, otherwise it uses your logged-in Sanity CLI session.

### Browser auth for real-project mode

The Playwright browser is isolated from your normal Chrome/Safari profile, so being logged into Studio in your regular browser is not enough. Capture a Playwright storage state file once, then reuse it for repeatable local runs.

Google login can reject Playwright's bundled Chromium with "This browser or app may not be secure." For local auth setup, this config uses the installed Chrome channel by default. If Playwright cannot find Chrome, install it with:

```bash
pnpm exec playwright install chrome
```

You can override the auth browser channel in `apps/sanity-presentation-e2e/.env.local`:

```dotenv
SANITY_E2E_BROWSER_CHANNEL=chrome
```

Start the headed auth setup and complete the Studio login when the browser opens:

```bash
SANITY_E2E_STUDIO_MODE=real-project SANITY_E2E_AUTH_SETUP=1 \
pnpm exec playwright test --config apps/sanity-presentation-e2e/playwright.config.ts auth.setup.ts --headed --workers=1
```

If Google still rejects the Playwright-launched browser, launch a real Chrome instance yourself and let Playwright attach to it:

```bash
mkdir -p apps/sanity-presentation-e2e/.auth/chrome-profile
open -na "Google Chrome" --args \
  --remote-debugging-port=9222 \
  --user-data-dir="$(pwd)/apps/sanity-presentation-e2e/.auth/chrome-profile"
```

Then run auth setup with the DevTools endpoint:

```bash
SANITY_E2E_STUDIO_MODE=real-project SANITY_E2E_AUTH_SETUP=1 \
SANITY_E2E_CDP_ENDPOINT=http://127.0.0.1:9222 \
pnpm exec playwright test --config apps/sanity-presentation-e2e/playwright.config.ts auth.setup.ts --headed --workers=1
```

Either auth setup command starts the preview app and Studio fixture, opens a headed browser, waits up to 10 minutes until you finish the Studio login and the `/presentation-smoke` preview frame loads, then writes:

```text
apps/sanity-presentation-e2e/.auth/sanity-storage-state.json
```

The package script runs the same auth setup:

```bash
pnpm turbo run e2e-real-studio-auth --filter=sanity-presentation-e2e
```

After the file exists, set this in `apps/sanity-presentation-e2e/.env.local` or your shell before running `e2e-real-studio`:

```dotenv
SANITY_E2E_STORAGE_STATE=apps/sanity-presentation-e2e/.auth/sanity-storage-state.json
```

Then run the real-project smoke:

```bash
pnpm turbo run e2e-real-studio --filter=sanity-presentation-e2e
```

The storage file contains local auth state and should stay uncommitted.

If you want more time during local auth, set either timeout in `apps/sanity-presentation-e2e/.env.local`:

```dotenv
SANITY_E2E_AUTH_TIMEOUT_MS=900000
SANITY_E2E_REAL_PROJECT_TIMEOUT_MS=900000
```

The Studio fixture lives in `apps/sanity-presentation-e2e-studio` and uses the same Sanity 3.67 dependency line as this repository.

# Limitless Angular Compatibility Contract

This workspace publishes `@limitless-angular/sanity` and verifies Angular
support through the private `@limitless-angular/angular-compat` package.
Adding support for a stable Angular major means updating the public peer range
and the generated-consumer compatibility matrix.

## Required Files

- `packages/sanity/package.json`
  - Update `peerDependencies.@angular/common`.
  - Update `peerDependencies.@angular/core`.
  - Update `peerDependencies.@angular/router`.
  - Keep these three Angular peer ranges identical.
- `tools/angular-compat/config.json`
  - Add `angular-<major>-floor` with `mode: "floor"`.
  - Add `angular-<major>-latest` with `mode: "latest"`.
  - Set `buildAngularMajor` to the newest stable major represented by
    `consumerVersionSets`.

Use the helper for this deterministic edit:

```bash
node .agents/skills/angular-version-support/scripts/add-angular-version.ts --major <major>
```

The helper also backfills missing `floor`/`latest` rows for stable Angular
majors that are already declared by the peer range or compatibility config.

For a preview:

```bash
node .agents/skills/angular-version-support/scripts/add-angular-version.ts --major <major> --dry-run
```

## Required Audit

After the deterministic edit, search for version-specific branches and stale
contract text:

```bash
rg 'VERSION|isAngularVersionLessThan|angular-[0-9]|Angular [0-9]' \
  packages/sanity tools/angular-compat .github tools/release package.json
```

Always inspect `packages/sanity/shared/src/angular-versions.ts`. Update it only
when the requested Angular support changes a real runtime branch or minimum
version check.

Treat these as compatibility contract surfaces:

- `tools/angular-compat/*.test.mjs`
- `tools/angular-compat/orchestration-contract.test.mjs`
- `.github/workflows/ci.yml`
- `.github/workflows/release-and-publish.yml`
- `.github/workflows/release-dry-run.yml`
- `tools/release/src/pipeline.mjs`

Do not change these files only because a new major was added. Change them when
tests reveal a contract drift or when the user asks to update the orchestration.

## Demo App Pins

The demo and e2e Angular apps currently pin their own Angular toolchains. Do
not upgrade those app dependencies as part of "add Angular support" unless the
user asks for a workspace or example-app upgrade. The compatibility harness
builds and tests generated consumers separately from the demo apps.

## Validation

Run focused validation after updating the support matrix:

```bash
node --test tools/angular-compat/*.test.mjs
pnpm run compat:assert
pnpm run compat:matrix
```

For real support changes, also run:

```bash
pnpm run compat:pack
pnpm run compat:artifact
pnpm run compat:test --angular <major>
```

The root `compat:test` script already forwards arguments to the compat package.
If `compat:test --angular <major>` reports no latest row, re-check
`tools/angular-compat/config.json` for `angular-<major>-latest`.

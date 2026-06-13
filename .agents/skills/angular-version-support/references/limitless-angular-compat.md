# Limitless Angular Compatibility Contract

This workspace publishes `@limitless-angular/sanity` and verifies Angular
support through the private `@limitless-angular/angular-compat` package.
Adding support for a stable Angular major means updating the public peer range,
the generated-consumer compatibility matrix, and every workspace app/package
manifest that pins Angular packages so the repo can install, build, and test on
that major.

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
- Workspace `package.json` files with direct Angular toolchain dependencies
  - Update direct `@angular/*` dependency and devDependency ranges.
  - Update direct `@angular-devkit/*` devDependency ranges.
  - Update direct `angular-eslint` and `ng-packagr` devDependency ranges.
  - Update demo/e2e app manifests by default; they must run with the requested
    Angular major unless the user explicitly asks for library-only support.

Use the helper for this deterministic edit:

```bash
node .agents/skills/angular-version-support/scripts/add-angular-version.ts --major <major>
```

The helper also updates workspace Angular package pins and backfills missing
`floor`/`latest` rows for stable Angular majors that are already declared by
the peer range or compatibility config.

For a preview:

```bash
node .agents/skills/angular-version-support/scripts/add-angular-version.ts --major <major> --dry-run
```

For explicit library-only support without demo/e2e app manifest upgrades:

```bash
node .agents/skills/angular-version-support/scripts/add-angular-version.ts --major <major> --library-only
```

## Required Audit

After the helper runs, update packages that require registry-specific
compatibility decisions:

- `typescript`: resolve the version range required by
  `@angular/compiler-cli@<major>` and update all workspace manifests that pin
  TypeScript.
- Angular-adjacent adapters such as `@analogjs/vite-plugin-angular`,
  `@analogjs/vitest-angular`, and `@testing-library/angular`: inspect current
  peer compatibility and update when the requested Angular major requires it.
- `pnpm-lock.yaml`: run `pnpm install` after package manifest edits so the
  lockfile matches the workspace upgrade.

Do not stop after the helper if any TypeScript, adapter, or lockfile updates
are still required for the workspace to install and run tests on the requested
Angular major.

For every target major, treat validation failures as evidence to inspect the
matching Angular release notes, official migrations, and dependency peer ranges.
Update code and toolchain packages only when the target major requires it.
Report target-specific findings in the final output or PR notes so the next
skill revision can decide whether they are durable enough to encode here.

Do not add new Angular framework dependencies to `packages/sanity` only to
satisfy transitive peer resolution. Add a framework package only when source or
tests directly import it, or when the repo intentionally broadens its Angular
test surface. Otherwise investigate test setup, adapters, and lockfile
resolution first, then report the exact failure if the fix is unclear.

## Official Angular Migrations

Prefer official Angular migrations before manual code edits. Angular supports
update automation through `ng update`, and the CLI can run code migrations as
part of an update.

Use the Angular Update Guide for the current-to-target major pair, then run the
CLI migrations where this repo has Angular projects:

```bash
rg --files -g angular.json apps packages
```

Run app migrations from the workspace root with `pnpm --filter` so Volta and
pnpm use the repo Node version. Verify the filtered command sees the repo Node:

```bash
pnpm --filter <workspace-package-name> exec node -v
```

If the helper already updated package manifests and you only need code
migrations, run migration-only commands one workspace package at a time. Include
`--allow-dirty` because the helper and dependency updates make the worktree
dirty before migrations run:

```bash
pnpm --filter <workspace-package-name> exec ng update @angular/core --migrate-only --from <from> --to <target> --allow-dirty
pnpm --filter <workspace-package-name> exec ng update @angular/cli --migrate-only --from <from> --to <target> --allow-dirty
```

This repo's app-local `angular.json` files may cause some Angular core
migrations to resolve `../../tsconfig.base.json` incorrectly. If `ng update`
fails with a tsconfig path error, record the failure, inspect the migration's
targeted patterns, and manually audit/apply the relevant code changes. Do not
replace official migrations with manual text edits unless no applicable
migration is available or the migration fails and the failure is understood.

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

## Validation

Run focused validation after updating the support matrix and workspace package
manifests:

```bash
pnpm install
node --test tools/angular-compat/*.test.mjs
pnpm run compat:assert
pnpm run compat:matrix
pnpm run build
pnpm run test
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

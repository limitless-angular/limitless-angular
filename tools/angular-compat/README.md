# Angular Compatibility Harness

This harness verifies that `@limitless-angular/sanity` can be built once,
packed once, and installed into fresh Angular consumer applications for every
supported Angular version set.

The compatibility promise is about the released package shape:

```txt
build library -> pack .tgz -> install same .tgz in generated Angular apps
```

It intentionally does not test the monorepo source package directly. The
generated consumers install the packed tarball, so the checks catch missing
exports, bad declaration files, local dependency leaks, Angular compiler
incompatibilities, and runtime boot failures that a real application would see
after installation from npm.

## Commands

Run the full pipeline:

```bash
pnpm run compat
```

Run individual steps:

```bash
pnpm run compat:affected --base-ref origin/main
pnpm run compat:affected:test
pnpm turbo run test --filter=@limitless-angular/angular-compat
pnpm run compat:assert
pnpm run compat:matrix
pnpm run compat:matrix --canary
pnpm run compat:pack
pnpm run compat:artifact
pnpm run compat:test
pnpm run compat:test --set angular-19-floor
pnpm run compat:test --set angular-21-latest --skip-runtime
pnpm run compat:canary-report --status-dir .compat/canary-status
pnpm run compat:release-parity
```

The compatibility tooling is a private workspace package named
`@limitless-angular/angular-compat`, so Turbo can run its package-level unit
tests with `pnpm turbo run test --filter=@limitless-angular/angular-compat`.
Root `compat:*` scripts route lifecycle commands through Turbo and filter to the
compat package. Package-local command names use the same `compat:*` namespace,
with `tools/angular-compat/cli.mjs` owning argument parsing.
`tools/angular-compat/turbo.json` scopes the compat-only Turbo task settings to
this package; the root `turbo.json` keeps shared monorepo tasks. The matrix
command is the one intentional direct package call because CI captures its
stdout as JSON. Playwright browser installation is also direct package setup,
not a Turbo task. The compatibility behavior lives in reusable functions in the
other `.mjs` files.

The package unit tests include an orchestration contract test that protects
these routing decisions without running the slow pack or generated-consumer
checks. Run them with
`pnpm turbo run test --filter=@limitless-angular/angular-compat`.

## Version Sets

`tools/angular-compat/config.json` is the source of truth.

Stable required consumers live in `consumerVersionSets`:

```json
{
  "id": "angular-19-floor",
  "angularMajor": 19,
  "mode": "floor"
}
```

Supported modes:

- `floor`: latest patch in the first minor for that major, such as
  `>=19.0.0 <19.1.0`. This protects consumers on the lowest version promised by
  the peer range.
- `latest`: latest published release for that Angular major.
- `dist-tag`: npm dist-tag such as `next`. Use this only in
  `canaryVersionSets`, because canaries are advisory.

Canary toolchains resolve Angular framework packages from `@angular/core` and
resolve CLI-owned packages, such as `@angular/build` and `@angular/cli`, from
their own npm dist-tags. This keeps the advisory matrix resilient when the
Angular framework and Angular CLI release trains publish prereleases at
different times.

`buildAngularMajor` is the stable major used to build the library artifact. It
must be the newest stable Angular major represented by `consumerVersionSets`.
The test matrix then installs the same tarball into every configured consumer.

## What Gets Tested

`compat:pack` creates a temporary workspace, installs the selected build
toolchain, builds the Angular package, and writes one tarball under
`.compat/artifacts`.

`compat:prepare-publish` removes source-only metadata, such as `private: true`,
from a built package manifest before preview or release publishing. It can also
write an explicit semver version into that manifest.

`compat:artifact` validates the tarball:

- package name and expected version match
- package is not private
- no scripts or dev dependencies are published
- no `workspace:`, `file:`, `link:`, or `portal:` dependency references leak
- expected package exports exist
- exported declaration files and FESM bundles exist
- no source `.ts` files or `node_modules` are included

`compat:test` creates generated Angular applications and installs the packed
tarball into them. Each generated app:

- imports every configured public entrypoint
- compiles public API type smoke checks
- builds in production mode
- boots in Chromium with Playwright
- verifies Portable Text rendering and Sanity image URL generation
- fails on browser page errors or console errors

CI first runs `pnpm turbo run compat:affected
--filter=@limitless-angular/angular-compat` to decide whether the Sanity
compatibility jobs are relevant. The decision asks Turbo whether either
`@limitless-angular/sanity` or `@limitless-angular/angular-compat` has affected
package tasks. A small explicit contract list covers files that are outside
package ownership but still define the compatibility workflow, such as
CI/release workflows, `.nvmrc`, `turbo.json`, and the release tooling package.
`workflow_dispatch` always runs the compatibility jobs.

When eligible, CI runs stable consumers as required jobs and `angular-next` as
an advisory canary job. Stable consumer failures block the PR. Canary failures
keep the CI run green, emit GitHub warnings, and publish a single managed PR
comment so reviewers can see future-version drift without opening the Actions
log. When all canary rows pass again, CI removes the managed comment. Canary
status artifacts include the exact Angular, Angular CLI, and TypeScript
versions that were tested so the advisory comment stays useful as npm dist-tags
move. The report formatting and sticky-comment behavior live in
`tools/angular-compat/canary-report.mjs`; the workflow only downloads the
status artifacts and calls that reporter.

## Adding Angular Version Support

To add support for another Angular major:

1. Update the Angular peer dependency range in
   `packages/sanity/package.json`.
2. Add stable version sets to `consumerVersionSets` in
   `tools/angular-compat/config.json`.
3. Set `buildAngularMajor` to the newest stable major in
   `consumerVersionSets`.
4. Optionally add or update a canary set in `canaryVersionSets`.
5. Run:

```bash
pnpm run compat:assert
pnpm run compat:matrix
pnpm run compat:pack
pnpm run compat:artifact
pnpm run compat:test
```

Adding a new stable major usually means adding both a floor and a latest row.
Replace `<major>` with the Angular major being added:

```js
{
  "id": "angular-<major>-floor",
  "angularMajor": <major>,
  "mode": "floor"
},
{
  "id": "angular-<major>-latest",
  "angularMajor": <major>,
  "mode": "latest"
}
```

The exact major in the id is not special to the tooling, but keeping it explicit
makes CI output easy to scan.

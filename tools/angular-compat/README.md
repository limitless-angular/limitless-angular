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
pnpm run compat:assert
pnpm run compat:matrix
pnpm run compat:matrix --canary
pnpm run compat:pack
pnpm run compat:artifact
pnpm run compat:test
pnpm run compat:test --set angular-18-floor
pnpm run compat:test --set angular-19-latest --skip-runtime
pnpm run compat:release-parity
```

All commands are routed through `tools/angular-compat/cli.mjs`. The CLI owns
argument parsing. The compatibility behavior lives in reusable functions in the
other `.mjs` files.

## Version Sets

`tools/angular-compat/config.json` is the source of truth.

Stable required consumers live in `consumerVersionSets`:

```json
{
  "id": "angular-18-floor",
  "angularMajor": 18,
  "mode": "floor"
}
```

Supported modes:

- `floor`: latest patch in the first minor for that major, such as
  `>=18.0.0 <18.1.0`. This protects consumers on the lowest version promised by
  the peer range.
- `latest`: latest published release for that Angular major.
- `dist-tag`: npm dist-tag such as `next`. Use this only in
  `canaryVersionSets`, because canaries are advisory.

`buildAngularMajor` is the stable major used to build the library artifact. It
must be the newest stable Angular major represented by `consumerVersionSets`.
The test matrix then installs the same tarball into every configured consumer.

## What Gets Tested

`compat:pack` creates a temporary workspace, installs the selected build
toolchain, builds the Angular package, and writes one tarball under
`.compat/artifacts`.

`compat:artifact` validates the tarball:

- package name and version match the source package
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

CI runs stable consumers as required jobs and `angular-next` as an advisory
canary job.

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

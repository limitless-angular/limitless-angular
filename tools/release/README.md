# Release Tools

`@limitless-angular/release-tools` owns the release pipeline for
`@limitless-angular/sanity`. GitHub Actions stays thin: workflows install the
workspace and call this package.

## Commands

Plan a release without changing files:

```bash
pnpm run release:plan --version patch
pnpm run release:plan --version 19.3.0 --json
```

Validate a prospective release without publishing:

```bash
pnpm run release:dry-run --version patch
```

Publish a release:

```bash
pnpm turbo run release:publish --filter=@limitless-angular/release-tools -- --version patch
```

## Pipeline

Both dry-run and publish mode use the same release pipeline:

1. Compute the release plan from the current package version, explicit version
   input, or conventional commits.
2. Apply the planned package version and changelog to the runner workspace.
3. Build one compatibility artifact with `compat:pack`.
4. Validate artifact shape with `compat:artifact`.
5. Assert the packed artifact version equals the planned next version.
6. Install the Playwright browser used by compatibility consumers.
7. Test the same artifact with `compat:test`.
8. In publish mode only, commit, tag, publish the tarball to npm, push the
   release commit and tag, and create the GitHub release.

Dry-run mode restores `packages/sanity/package.json` and
`packages/sanity/CHANGELOG.md` after validation. The packed tarball remains under
`.compat/artifacts` so maintainers can inspect the exact candidate artifact.

## Safety Model

Dry-run mode validates the artifact that would be published, including the
planned `nextVersion`. It never receives npm credentials in GitHub Actions and
does not perform git, npm, or GitHub release side effects.

Publish mode performs external side effects only after tests, linting, artifact
validation, and compatibility consumer checks pass. The GitHub workflow also
targets the `npm-release` environment so repository environment protection rules
can require approval before npm credentials are exposed.

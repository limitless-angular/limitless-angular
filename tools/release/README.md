# Release Tools

`@limitless-angular/release-tools` owns the release pipeline for
`@limitless-angular/sanity`. GitHub Actions stays thin: workflows install the
workspace and call this package.

## Commands

Plan a release without changing files:

```bash
pnpm run release:plan --version patch
pnpm run release:plan --version 19.3.0 --json
pnpm run release:plan --prerelease
```

Validate a prospective release without publishing:

```bash
pnpm run release:dry-run --version patch
pnpm run release:dry-run --prerelease
```

Publish a release:

```bash
pnpm turbo run release:publish --filter=@limitless-angular/release-tools -- --version patch
pnpm turbo run release:publish --filter=@limitless-angular/release-tools -- --prerelease
```

Prerelease mode infers the release level from conventional commits and uses the
`next` prerelease identifier. For example, a feature-level release from
`19.2.0` becomes `19.3.0-next.0`; the next prerelease in that train becomes
`19.3.0-next.1`.

## Pipeline

Both dry-run and publish mode use the same release pipeline:

1. Compute the release plan from the current package version, explicit version
   input, or conventional commits.
2. In publish mode only, verify the release is running from `main`, the
   worktree matches `origin/main`, the release tag is unused, the planned npm
   version is unpublished, and `GITHUB_TOKEN` is available for the GitHub
   release.
3. Apply the planned package version and changelog to the runner workspace.
4. Build one compatibility artifact with `compat:pack`.
5. Validate artifact shape with `compat:artifact`.
6. Assert the packed artifact version equals the planned next version.
7. Install the Playwright browser used by compatibility consumers.
8. Test the same artifact with `compat:test`.
9. In publish mode only, commit, tag, re-check the remote release branch, npm
   version, and remote tag, publish the tarball to npm, push the
   release commit and tag, and create the GitHub release.

Prerelease versions are published to npm with the `next` dist-tag and their
GitHub releases are marked as prereleases. Stable versions use npm's `latest`
dist-tag.

Dry-run mode restores `packages/sanity/package.json` and
`packages/sanity/CHANGELOG.md` after validation. The packed tarball remains under
`.compat/artifacts` so maintainers can inspect the exact candidate artifact.

## Safety Model

Dry-run mode validates the artifact that would be published, including the
planned `nextVersion`. It never receives npm credentials in GitHub Actions and
does not perform git, npm, or GitHub release side effects.

Publish mode performs external side effects only after tests, linting, artifact
validation, compatibility consumer checks, and publish preflights pass. The
GitHub workflow only runs publish from `main` and targets the `npm-release`
environment so repository environment protection rules can require approval
before publishing.

The npm package must trust the GitHub Actions publisher for
`limitless-angular/limitless-angular`, workflow `release-and-publish.yml`, and
environment `npm-release`; the publish job uses npm trusted publishing instead
of a long-lived npm token.

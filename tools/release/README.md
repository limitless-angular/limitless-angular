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

## Source of Truth

Release state lives outside the source package:

- Git tags (`sanity@<version>`) identify the exact commit released.
- npm versions and dist-tags identify what consumers can install.
- GitHub Releases contain generated release notes.

`packages/sanity/package.json` intentionally uses
`0.0.0-development` and `private: true`. The release pipeline injects the real
planned version only into the temporary compatibility build workspace and the
packed npm tarball. Do not update the source package version or add a committed
changelog for releases.

## Pipeline

Both dry-run and publish mode use the same release pipeline:

1. Compute the release plan from the latest reachable `sanity@*` tag, explicit
   version input, or conventional commits.
2. In publish mode only, verify the release is running from `main`, the
   worktree matches `origin/main`, existing release state points at the current
   commit, npm trusted publishing OIDC is available, and `GITHUB_TOKEN` is
   available for the GitHub release.
3. Build one compatibility artifact with `compat:pack`, injecting the planned
   package version through `LIMITLESS_RELEASE_VERSION`.
4. Validate artifact shape with `compat:artifact`.
5. Assert the packed artifact version equals the planned next version.
6. Install the Playwright browser used by compatibility consumers.
7. Test the same artifact with `compat:test`.
8. In publish mode only, re-check the remote release branch and existing
   release state, create and push the release tag, publish the tarball to npm,
   and create the GitHub release.

Prerelease versions are published to npm with the `next` dist-tag and their
GitHub releases are marked as prereleases. Stable versions use npm's `latest`
dist-tag.

Dry-run mode does not change tracked files. The packed tarball remains under
`.compat/artifacts` so maintainers can inspect the exact candidate artifact.

## Safety Model

Dry-run mode validates the artifact that would be published, including the
planned `nextVersion`. It never receives npm credentials in GitHub Actions and
does not perform git, npm, or GitHub release side effects.

Publish mode performs external side effects only after tests, linting, artifact
validation, compatibility consumer checks, and publish preflights pass. It never
pushes to `main`; it only creates the release tag. The GitHub workflow only runs
publish from `main` and targets the `npm-release` environment so repository
environment protection rules can require approval before publishing.

The workflow is rerunnable. If the release tag already exists at `HEAD`, the
pipeline reuses it. If the npm version already exists and the expected dist-tag
points at it, npm publish is skipped. If the GitHub Release already exists with
the expected prerelease status, release creation is skipped. Any matching object
that points somewhere else fails loudly instead of overwriting state.

The npm package must trust the GitHub Actions publisher for
`limitless-angular/limitless-angular`, workflow `release-and-publish.yml`, and
environment `npm-release`; the publish job uses npm trusted publishing instead
of a long-lived npm token. The package `repository.url` must exactly match
`https://github.com/limitless-angular/limitless-angular` so npm can match the
OIDC publisher to the package metadata. Because the publish-capable release
tasks run through Turborepo strict environment mode, their task configuration
must pass through `ACTIONS_ID_TOKEN_REQUEST_*`, `GITHUB_*`, and
`NPM_CONFIG_PROVENANCE` so npm can exchange the GitHub OIDC request for trusted
publish authorization.

# Release Tools

`@limitless-angular/release-tools` owns the release pipeline for
`@limitless-angular/sanity`. GitHub Actions stays thin: workflows install the
workspace and call this package.

## Commands

Plan a release without changing files:

```bash
pnpm run release:plan -- --intent stable --bump auto
pnpm run release:plan -- --intent prerelease --bump major
pnpm run release:plan -- --intent promote-stable --json
```

Preview the GitHub Release notes for the same plan:

```bash
pnpm run release:notes -- --intent stable --bump auto
pnpm run release:notes -- --intent promote-stable
```

Validate a prospective release without publishing:

```bash
pnpm run release:dry-run -- --intent stable --bump auto
pnpm run release:dry-run -- --intent prerelease --bump major
```

Publish a release:

```bash
pnpm turbo run release:publish --filter=@limitless-angular/release-tools -- --intent stable --bump auto
pnpm turbo run release:publish --filter=@limitless-angular/release-tools -- --intent promote-stable
```

Release planning is intent-based. Maintainers choose the kind of release; the
tool computes the exact version:

- `stable` publishes to npm's `latest` dist-tag. `--bump auto` derives
  `patch`, `minor`, or `major` from package-relevant conventional commits.
- `prerelease` publishes to npm's `next` dist-tag with the `next` prerelease
  identifier. For example, `--intent prerelease --bump major` from `21.0.0`
  becomes `22.0.0-next.0`; the next prerelease in that train becomes
  `22.0.0-next.1`.
- `promote-stable` promotes the latest prerelease train to stable without a
  human typing the version. For example, `22.0.0-next.1` becomes `22.0.0`.
- `manual` is an escape hatch that requires `--manual-version` and
  `--manual-reason`.

Stable major releases without a prerelease train are blocked unless maintainers
explicitly pass `--allow-major-without-prerelease`. If the latest reachable
release tag is a prerelease, `stable` refuses to guess; use `promote-stable` to
publish that train as stable.

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

## Package Relevance

Release planning is package-aware. Each releasable package is configured in
`tools/release/src/config.mjs` with:

- `releasePaths`: repository paths that belong to the package.
- `releaseScopes`: conventional commit scopes that explicitly target the
  package.
- `ignoredReleaseScopes`: infrastructure scopes that should not infer a package
  release from the commit scope alone.
- `ignoredReleaseScopePaths`: source-only metadata paths that ignored
  infrastructure scopes may touch without inferring a package release.
- `ignoredReleaseScopeJsonFields`: top-level JSON fields that ignored
  infrastructure scopes may touch without inferring a package release.
- `releaseTagPrefix`: the Git tag prefix for that package's versions.
- `stablePromotionIgnoredPaths`: package-owned documentation paths that may
  change after a prerelease without requiring another prerelease before stable
  promotion.

The planner derives inferred versions from commits that either touch a
configured package path or use a configured package scope. For
`@limitless-angular/sanity`, a change under `packages/sanity/**` or a commit
like `feat(sanity): add preview support` is release-relevant. Tooling-only
commits such as `feat(release): harden publishing` do not create package
releases, even when they touch configured source-only package metadata. For
`packages/sanity/package.json`, only release-bookkeeping fields such as
`version` and `private` are ignored this way; consumer-facing manifest changes
such as dependency, peer dependency, or export updates still infer a release.
Source changes still infer releases by path, even if their conventional commit
scope is wrong. Maintainers can use the `manual` release intent when the normal
state machine cannot represent an exceptional recovery release.

GitHub Release notes use the same package-relevance filter, but their base tag
depends on the release type. Prerelease notes are incremental from the latest
reachable `sanity@*` tag. Stable release notes start at the latest stable
`sanity@*` tag, ignoring prerelease tags, so a final `20.0.0` release summarizes
the full `20.0.0-next.*` train since the previous stable release. Breaking
change sections include the `BREAKING CHANGE:` footer text when commits provide
one.

## Pipeline

Both dry-run and publish mode use the same release pipeline:

1. Compute the release plan from the latest reachable `sanity@*` tag, explicit
   release intent, or package-relevant conventional commits. Stable GitHub
   Release notes use the latest stable tag as their base so final releases
   summarize their prerelease train.
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
publish from `main`.

`release-and-publish.yml` first computes and validates a release plan outside
the protected publishing environment. After the dry run passes, the publish job
enters the `npm-release` environment for approval, recomputes the plan at the
same commit, and verifies the validated and publish-time summaries match before
creating tags, publishing to npm, or creating the GitHub Release.

The validation job summary includes the future GitHub Release notes generated
from the same release plan. The protected `npm-release` environment links back
to the workflow run so approvers can review the computed version, tag, dist-tag,
and notes before approving the publish job.

`promote-stable` refuses to publish if package-impacting commits landed after
the latest prerelease tag. Tooling-only commits and configured package
documentation paths can land after the prerelease, but package code or manifest
changes require another prerelease before a stable promotion.

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

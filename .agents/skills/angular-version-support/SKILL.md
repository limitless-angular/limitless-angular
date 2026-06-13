---
name: angular-version-support
description: Deterministic support for adding, validating, or updating Angular major-version compatibility in the limitless-angular workspace. Use when Codex is asked to add support for a new Angular version, update the Angular peer matrix, validate Angular compatibility, or adjust this repo's Angular compatibility harness, especially for @limitless-angular/sanity.
---

# Angular Version Support

Use this skill for repo-specific Angular compatibility work in the
`limitless-angular` workspace.

Before changing files, read
[`references/limitless-angular-compat.md`](references/limitless-angular-compat.md).

## Workflow

1. Identify the requested Angular major from the user prompt.
   - If no target major is present, ask for the Angular major before mutating files.
   - Recognize forms like "Angular <major>", "v<major>", and
     "major <major>".
2. Use the deterministic helper when the task is to add a stable Angular major
   or move the workspace package manifests to that major:

   ```bash
   node .agents/skills/angular-version-support/scripts/add-angular-version.ts --major <major>
   ```

   Use `--dry-run` before applying when the user asks for a preview. Use
   `--library-only` only when the user explicitly asks not to update demo/e2e
   app manifests.
3. Update the lockfile and any Angular-adjacent packages the helper calls out.
4. Run official Angular migrations where possible before making manual code
   fixes.
5. Audit the project-specific compatibility files listed in the reference.
6. Run the focused validation and workspace test commands from the reference.
7. If general Angular coding changes are required, use `$angular-developer` after
   the compatibility matrix has been updated.
8. Report target-version-specific migration failures or fixes in your final
   output. Add them to this skill only when they describe a durable repo rule.

## Rules

- Do not use Python for this skill's workflow or bundled scripts.
- Keep bundled scripts executable with plain Node 22; do not require `tsx`,
  `ts-node`, build steps, or a custom runner.
- Update Angular package pins across workspace apps and packages by default so
  the repo can install, build, and test against the requested Angular major.
- Keep stable compatibility rows deterministic: one `floor` row and one
  `latest` row for every supported Angular major.
- Keep the skill version-neutral. Do not bake in one-off findings from a single
  target major unless they generalize across future Angular upgrades.

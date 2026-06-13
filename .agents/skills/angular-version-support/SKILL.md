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
   - Treat prompts like "Angular 20", "v20", and "major 20" as target major `20`.
2. Use the deterministic helper when the task is to add a stable Angular major:

   ```bash
   node .agents/skills/angular-version-support/scripts/add-angular-version.ts --major <major>
   ```

   Use `--dry-run` before applying when the user asks for a preview.
3. Audit the project-specific compatibility files listed in the reference.
4. Run the focused validation commands from the reference.
5. If general Angular coding changes are required, use `$angular-developer` after
   the compatibility matrix has been updated.

## Rules

- Do not use Python for this skill's workflow or bundled scripts.
- Keep bundled scripts executable with plain Node 22; do not require `tsx`,
  `ts-node`, build steps, or a custom runner.
- Do not mass-upgrade demo app Angular dependency pins unless the user
  explicitly asks for a workspace upgrade.
- Keep stable compatibility rows deterministic: one `floor` row and one
  `latest` row for every supported Angular major.

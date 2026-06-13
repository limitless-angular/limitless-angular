---
name: create-pr
description: Creates GitHub pull requests for this repo. Use when opening, drafting, publishing, or updating a pull request; enforces the repo PR template and Conventional Commits PR titles.
---

# Create PR

Create pull requests with the repo's required title and description format.

## Workflow

1. Inspect the branch, diff, commits, and repo instructions before writing PR text.
2. Read `.github/pull_request_template.md` and use it as the PR description structure.
3. Write the PR title as a Conventional Commit: `type(optional-scope): imperative summary`.
4. Fill every applicable PR template section with concrete details from the change.
5. Keep template headings and checklists intact unless the user explicitly asks for a different format.
6. Include exact validation commands in Testing and mark completed checklist items accurately.
7. Call out UI media, operational impact, rollout, rollback, and reviewer notes when relevant.
8. Create a ready-for-review PR with the prepared title and body unless the user explicitly requests a draft PR.
9. After creation, verify the PR title and body match these requirements before handing back the link.

## Title Rules

- Use Conventional Commit types such as `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `build`, or `ci`.
- Add a scope only when it clarifies the affected area.
- Use a concise imperative summary with no trailing period.

## Description Rules

- Base the body on `.github/pull_request_template.md`, not an ad hoc summary.
- Preserve required sections even when the entry is `N/A`.
- For visible UI changes, include screenshots or video when available, or state why they are missing.
- For Appwrite, migrations, native apps, deployment, env vars, or secrets, complete the Operational Impact checklist honestly.

## Draft Rules

- Default to a normal, ready-for-review PR.
- Create a draft PR only when the user explicitly asks for draft status.

# Contributing to Limitless Angular

We're excited that you're interested in contributing to Limitless Angular! This document outlines the process for contributing to this project.

## Getting Started

### Development Environment Setup

1. Ensure you have [nvm (Node Version Manager)](https://github.com/nvm-sh/nvm) installed.
2. Clone the repository and navigate to the project root.
3. Run `nvm use` to switch to the correct Node.js version.
4. Run `npm install` to install all dependencies.

### Example Apps

To run the Sanity example app:

```shell
npx nx run sanity-example:serve
```

## Submitting Pull Requests

**Please follow these basic steps to simplify pull request reviews.**

- Please rebase your branch against the current main.
- Please ensure the test suite passes before submitting a PR.
- Make reference to possible [issues](https://github.com/limitless-angular/limitless-angular/issues) on PR comment.

## Submitting bug reports

- Search through issues to see if a previous issue has already been reported and/or fixed.
- Provide a _small_ reproduction or a GitHub repository if possible.
- Please detail the affected browser(s) and operating system(s).
- Please be sure to state which version of Angular, node and npm you're using.

## Submitting new features

- We value keeping the API surface small and concise, which factors into whether new features are accepted.
- The feature will be discussed and considered.
- Once the PR is submitted, it will be reviewed and merged once approved.

## Questions and requests for support

Questions and requests for support should not be opened as issues and should be handled in the following ways:

- Start a new [Q&A Discussion](https://github.com/limitless-angular/limitless-angular/discussions/new?category=q-a) on GitHub.
- Ask a question on [StackOverflow](https://stackoverflow.com/questions/tagged/limitless-angular) using the `limitless-angular` tag.

## Commit Message Guidelines

We have very precise rules over how our git commit messages can be formatted. This leads to **more
readable messages** that are easy to follow when looking through the **project history**. But also,
we use the git commit messages to **generate the Limitless Angular changelog**.

### Commit Message Format

Each commit message consists of a **header**, a **body** and a **footer**. The header has a special
format that includes a **type**, a **scope** and a **subject**:

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

The **header** is mandatory and the **scope** of the header is optional.

Any line of the commit message cannot be longer than 100 characters! This allows the message to be easier
to read on GitHub as well as in various git tools.

The footer should contain a [closing reference to an issue](https://help.github.com/articles/closing-issues-via-commit-messages/) if any.

### Type

Must be one of the following:

- **build**: Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)
- **ci**: Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)
- **docs**: Documentation only changes
- **feat**: A new feature
- **fix**: A bug fix
- **perf**: A code change that improves performance
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc.)
- **test**: Adding missing tests or correcting existing tests

### Scope

The scope should be the name of the npm package affected (as perceived by the person reading the changelog generated from commit messages.

The following is the list of supported scopes:

- **sanity-example**
- **sanity**

### Subject

The subject contains a succinct description of the change:

- use the imperative, present tense: "change" not "changed" nor "changes"
- don't capitalize the first letter
- no dot (.) at the end

### Body

Just as in the **subject**, use the imperative, present tense: "change" not "changed" nor "changes".
The body should include the motivation for the change and contrast this with previous behavior.

### Footer

The footer should contain any information about **Breaking Changes** and is also the place to
reference GitHub issues that this commit **Closes**.

**Breaking Changes** should start with the word `BREAKING CHANGE:` with a space or two newlines. The rest of the commit message is then used for this.

Example:

```
feat(scope): commit message

BREAKING CHANGES:

Describe breaking changes here

BEFORE:

Previous code example here

AFTER:

New code example here
```

Thank you for contributing to Limitless Angular!

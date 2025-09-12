# AGENTS

This repository includes guidance for AI coding agents working within the project.

Scope: Instructions in this file apply to the entire repository. If a more deeply-nested AGENTS.md appears later, it takes precedence for files within that subtree.

## Principles

- English only: all code, comments, commit messages, and docs are in English.
- Be precise and conservative: make focused changes that solve the stated task without unrelated refactors.
- Prefer zero-dependency or standard-library solutions; avoid heavy dependencies.
- Keep the CLI interface backward compatible unless the task explicitly allows breaking changes.
- Maintain cross-platform behavior (macOS, Linux; Node 18+). Use LF line endings.

## Project layout (TypeScript-only)

- `src/cli.ts`: CLI entry and argument parsing
- `src/daily.ts`: core logic for daily aggregation
- `src/utils.ts`: helpers (filesystem walking, datetime parsing, formatting)
- `dist/`: compiled JavaScript (committed so npx github:owner/repo works without building)

## Build, run, test

- Build with `npm run build` (uses `tsc`).
- CLI runs as `node dist/cli.js` or via bin `cxusage` after installation.
- GitHub Actions already runs install, build and a smoke test.

Validation checklist for changes that touch runtime behavior:
- Add or update minimal smoke coverage in CI if needed.
- Verify `node dist/cli.js --help` and at least one example command.
- Ensure arguments/flags remain consistent unless intentionally changed.

## Packaging and release

- `package.json` contains `bin` mapping to `dist/cli.js` and `prepublishOnly` builds the package.
- Do not rely on `prepare` to build; we commit `dist/` and build in release workflow to support `npx github:...` usage.
- NPM publish is automated on tags matching `v*.*.*` via GitHub Actions; requires `NPM_TOKEN` secret.

## Code style

- TypeScript strict mode, Node 18+.
- Keep functions small, avoid unnecessary complexity.
- Use descriptive variable names; avoid single-letter names except for simple loops.
- Avoid inline comments unless clarifying non-obvious logic.

## Files to avoid modifying without need

- Workflow files under `.github/workflows/` unless task relates to CI/CD.
- LICENSE and governance docs unless updating policy.
- Compiled `dist/` files should reflect `src/` — regenerate via `npm run build`.

## How to propose large changes

- Outline a brief plan: goals, approach, and expected changes.
- Keep commits scoped and messages clear.
- If adding dependencies, justify the choice and impact.


# Contributing to cxusage

Thanks for your interest in contributing! This document outlines how to propose changes.

## Development setup

- Node.js 18+
- Install dependencies: `npm i`
- Build: `npm run build`
- Run: `node dist/cli.js --help`

## Running

- `node dist/cli.js --help`
- `node dist/cli.js daily --help`

## Coding style

- Keep changes minimal and focused on the task.
- Prefer small, readable functions; avoid unnecessary complexity.
- Maintain backward compatibility for CLI flags and behavior when possible.

## Pull requests

- Open an issue first if the change is significant.
- One logical change per PR, with clear title and description.
- Include tests or examples where it adds value.

## Releases

- Version is set in `package.json`.
- Tag the release `vX.Y.Z` and push the tag.
- GitHub Actions will build and publish to npm if `NPM_TOKEN` is configured.

## Code of Conduct

This project adheres to the Contributor Covenant, see CODE_OF_CONDUCT.md.

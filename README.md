# cxusage

Analyze Claude Code daily usage from Codex session logs. Similar to `ccusage`, this Node.js CLI scans JSONL session logs under `~/.codex/sessions` and aggregates token counts by day or by model within each day.

- Input: JSONL logs (recursively) under `~/.codex/sessions` by default
- Output: Plain table (default), Markdown table (`--md`), or JSON lines (`--json`)
- Grouping: By day (default) or by model-within-day (`--by model`)
- Timezone: Local timezone by default, or specify via `--tz` with an IANA TZ

## Quickstart

- After publish to npm: `npx cxusage --help`
- From GitHub (before publish): `npx github:Effet/cxusage -- --help`
- Typical commands:
  - `cxusage daily --from 2025-01-01 --to 2025-01-31 --md`
  - `cxusage daily --by model --json`

## Usage

The top-level command is `cxusage`. The primary subcommand is `daily`.

- Default root: `~/.codex/sessions`
- Date range: `--from YYYY-MM-DD`, `--to YYYY-MM-DD`
- Grouping: `--by day` (default) or `--by model`
- Output format: `--md` (Markdown) or `--json` (JSONL), default is a plain table
- Empty days: include zero-usage days via `--empty`

Examples:

- `cxusage daily`
- `cxusage daily --from 2025-01-01 --to 2025-01-31 --md`
- `cxusage daily --by model --json`
- Use a specific timezone: `cxusage daily --tz Asia/Shanghai`

## Pricing

The CLI automatically fetches model pricing from the public OpenRouter models API and estimates cost based on input/output tokens per model.

- API: `https://openrouter.ai/api/v1/models`
- If pricing is unavailable (offline or unknown model), cost shows as `$0.00` for those rows.

## Programmatic invocation

This package exposes only a CLI. If you need a library API, please open an issue to discuss the desired interface.

## Development

- Node 18+ required
- `npm i`
- `npm run build`
- `node dist/cli.js --help`


### Contribution Guide

- Issues: https://github.com/Effet/cxusage/issues
- Pull Requests: welcome! Please read CONTRIBUTING.md

### Release

- CI runs on pushes/PRs to verify install and build.
- Stable release: create a Git tag like `v0.1.0` to publish to npm as `latest`.
- The release workflow requires a repository secret `NPM_TOKEN` with publish permissions.

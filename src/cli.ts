#!/usr/bin/env node
/* eslint-disable no-console */

import * as os from 'os'
import * as path from 'path'
import { executeDaily, DailyArgs } from './daily'

const VERSION = '0.1.0'

function printHelp() {
  const defRoot = path.join(os.homedir(), '.codex', 'sessions')
  console.log(`usage: cxusage [daily] [--root ROOT] [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--tz TZ] [--by day|model] [--md|--json] [--empty] [--no-fallback] [--debug]\n`)
  console.log('Analyze Claude Code usage from Codex session logs.')
  console.log('\noptions:')
  console.log('  --root ROOT        Sessions root (default: ' + defRoot + ')')
  console.log('  --from DATE        Start date YYYY-MM-DD (inclusive)')
  console.log('  --to DATE          End date YYYY-MM-DD (inclusive)')
  console.log('  --tz TZ            IANA timezone, e.g. Asia/Shanghai; default local')
  console.log('  --by {day,model}   Group granularity: day (default) or model-within-day')
  console.log('  --md               Output as Markdown table')
  console.log('  --json             Output as JSON lines')
  console.log('  --empty            Show empty days (zero rows for missing days)')
  console.log('  --no-fallback      Disable pricing fallback for unknown models')
  console.log('  --debug            Print debug info about pricing/model matching')
  console.log('\ncommands:')
  console.log('  daily              Aggregate per day (optionally by model)')
}

function parseArgs(argv: string[]): { cmd: string | null, args: DailyArgs, version: boolean, help: boolean } {
  const out: DailyArgs = {}
  let i = 0
  let cmd: string | null = null
  let help = false
  let version = false

  if (argv[i] && !argv[i].startsWith('-')) {
    cmd = argv[i++]
  }
  for (; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--help' || a === '-h') { help = true; continue }
    if (a === '--version') { version = true; continue }
    if (a === '--md') { out.md = true; continue }
    if (a === '--json') { out.json = true; continue }
    if (a === '--empty') { out.empty = true; continue }
    if (a === '--no-fallback') { (out as any).noFallback = true; continue }
    if (a === '--debug') { (out as any).debug = true; continue }
    if (a === '--by') { out.by = argv[++i] as any; continue }
    if (a === '--root') { out.root = argv[++i]; continue }
    if (a === '--from') { out.from = argv[++i]; continue }
    if (a === '--to') { out.to = argv[++i]; continue }
    if (a === '--tz') { out.tz = argv[++i]; continue }
  }
  return { cmd, args: out, help, version }
}

async function main() {
  const { cmd, args, help, version } = parseArgs(process.argv.slice(2))
  if (version) { console.log('cxusage ' + VERSION); process.exit(0) }
  if (help) { printHelp(); process.exit(0) }
  const sub = cmd || 'daily'
  switch (sub) {
    case 'daily':
      process.exit(await executeDaily(args))
    default:
      console.error('Unknown command: ' + sub)
      printHelp()
      process.exit(2)
  }
}

main()

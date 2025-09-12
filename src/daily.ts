import { promises as fs } from 'fs'
import * as path from 'path'
import { listJsonlFiles, sumKeys, findFirst, parseWhen, formatDateInTZ } from './utils'
import { loadPricing, estimateCostFor } from './pricing'

const DEFAULT_ROOT = path.join(process.env.HOME || process.env.USERPROFILE || '', '.codex', 'sessions')

const TOKEN_KEYS_IN = ["input_tokens", "prompt_tokens", "request_tokens"]
const TOKEN_KEYS_OUT = ["output_tokens", "completion_tokens", "response_tokens"]
const MODEL_KEYS = [
  "model",
  "model_name",
  "modelId",
  "model_id",
  "modelSlug",
  "model_slug",
  "deployment",
  "engine",
  "request_model",
  "response_model",
  "selected_model",
  "target_model",
]
const TIME_KEYS = ["created_at", "timestamp", "time", "ts", "created", "start_time", "end_time"]

type Row = {
  date: string
  model?: string
  events: number
  input_tokens: number
  output_tokens: number
  total_tokens: number
  est_cost: number
}

export type DailyArgs = {
  root?: string
  from?: string
  to?: string
  tz?: string
  by?: 'day' | 'model'
  md?: boolean
  json?: boolean
  empty?: boolean
}

function getEnvPrice(name: string, def = '0'): number {
  const v = process.env[name] ?? process.env[name.replace('CXUSAGE_', 'CODUSAGE_')] ?? def
  const n = Number(v)
  return isFinite(n) ? n : 0
}

export async function executeDaily(args: DailyArgs): Promise<number> {
  const root = args.root || DEFAULT_ROOT
  const tz = args.tz
  const by = args.by || 'day'
  const disableFallback = (args as any).noFallback === true
  const fallbackModel = 'claude-3.5-sonnet'

  const files = await listJsonlFiles(root)

  const agg = new Map<string, {in: number; out: number; n: number}>()
  const aggModel = new Map<string, Map<string, {in: number; out: number; n: number}>>()

  let minDate: string | null = null
  let maxDate: string | null = null

  for (const file of files) {
    let mtime = new Date()
    try {
      const st = await fs.stat(file)
      mtime = st.mtime
    } catch {}

    const content = await fs.readFile(file, 'utf8')
    const lines = content.split(/\r?\n/)
    for (const line of lines) {
      const s = line.trim()
      if (!s) continue
      let obj: unknown
      try {
        obj = JSON.parse(s)
      } catch {
        continue
      }
      const inTok = sumKeys(obj, TOKEN_KEYS_IN)
      const outTok = sumKeys(obj, TOKEN_KEYS_OUT)
      const whenRaw = findFirst(obj, TIME_KEYS)
      const when = parseWhen(whenRaw, mtime)
      const day = formatDateInTZ(when, tz)

      if (!minDate || day < minDate) minDate = day
      if (!maxDate || day > maxDate) maxDate = day

      const model = (() => {
        const m = findFirst(obj, MODEL_KEYS)
        return typeof m === 'string' ? m : 'unknown'
      })()

      const cur = agg.get(day) || { in: 0, out: 0, n: 0 }
      cur.in += inTok
      cur.out += outTok
      cur.n += 1
      agg.set(day, cur)

      let mm = aggModel.get(day)
      if (!mm) { mm = new Map(); aggModel.set(day, mm) }
      const curm = mm.get(model) || { in: 0, out: 0, n: 0 }
      curm.in += inTok
      curm.out += outTok
      curm.n += 1
      mm.set(model, curm)
    }
  }

  const df = args.from || minDate || formatDateInTZ(new Date(), tz)
  const dt = args.to || maxDate || formatDateInTZ(new Date(), tz)

  // Load pricing from public API (OpenRouter models). If unavailable, costs are 0.
  const prices = await loadPricing()
  const debug = (args as any).debug === true
  if (debug) {
    const uniqueModels = new Set<string>()
    for (const day of aggModel.values()) for (const m of day.keys()) uniqueModels.add(m)
    console.error(`[cxusage] pricing entries: ${prices.size}, unique models seen: ${uniqueModels.size}`)
    const sample = Array.from(uniqueModels).slice(0, 10).join(', ')
    console.error(`[cxusage] sample models: ${sample}`)
  }

  const rows: Row[] = []
  for (let cur = new Date(df + 'T00:00:00Z'); ; ) {
    const curStr = formatDateInTZ(cur, tz)
    if (curStr > dt) break
    if (by === 'day') {
      const info = agg.get(curStr) || { in: 0, out: 0, n: 0 }
      if (!args.empty && info.n === 0) {
        // skip empty
      } else {
        const tot = info.in + info.out
        // Sum costs across models for this day using per-model pricing
        let cost = 0
        const mm = aggModel.get(curStr)
        if (mm) {
          for (const [m, inf] of mm.entries()) {
            let c = estimateCostFor(m, inf.in, inf.out, prices)
            if (!disableFallback && (!isFinite(c) || c === 0) && m === 'unknown') {
              c = estimateCostFor(fallbackModel, inf.in, inf.out, prices)
            }
            cost += c
          }
        }
        rows.push({
          date: curStr,
          events: info.n|0,
          input_tokens: Math.trunc(info.in),
          output_tokens: Math.trunc(info.out),
          total_tokens: Math.trunc(tot),
          est_cost: cost,
        })
      }
    } else {
      const mm = aggModel.get(curStr)
      if (!args.empty && !mm) {
        // skip
      } else if (!mm || mm.size === 0) {
        rows.push({ date: curStr, model: '-', events: 0, input_tokens: 0, output_tokens: 0, total_tokens: 0, est_cost: 0 })
      } else {
        const arr = Array.from(mm.entries())
        arr.sort((a,b)=>{
          const ta = a[1].in + a[1].out
          const tb = b[1].in + b[1].out
          if (ta !== tb) return tb - ta
          return a[0].localeCompare(b[0])
        })
        for (const [m, info] of arr) {
          const tot = info.in + info.out
          let cost = estimateCostFor(m, info.in, info.out, prices)
          if (!disableFallback && (!isFinite(cost) || cost === 0) && m === 'unknown') {
            cost = estimateCostFor(fallbackModel, info.in, info.out, prices)
          }
          rows.push({
            date: curStr,
            model: m,
            events: info.n|0,
            input_tokens: Math.trunc(info.in),
            output_tokens: Math.trunc(info.out),
            total_tokens: Math.trunc(tot),
            est_cost: cost,
          })
        }
      }
    }

    cur = new Date(cur.getTime() + 24*3600*1000)
  }

  if (args.json) {
    for (const r of rows) console.log(JSON.stringify(r))
    return 0
  }

  if (args.md) {
    if (by === 'day') {
      console.log('| date | events | input_tokens | output_tokens | total_tokens | est_cost |')
      console.log('|---|---:|---:|---:|---:|---:|')
      for (const r of rows) {
        console.log(`| ${r.date} | ${r.events} | ${r.input_tokens.toLocaleString()} | ${r.output_tokens.toLocaleString()} | ${r.total_tokens.toLocaleString()} | $${r.est_cost.toFixed(2)} |`)
      }
    } else {
      console.log('| date | model | events | input_tokens | output_tokens | total_tokens | est_cost |')
      console.log('|---|---|---:|---:|---:|---:|---:|')
      for (const r of rows) {
        console.log(`| ${r.date} | ${r.model} | ${r.events} | ${r.input_tokens.toLocaleString()} | ${r.output_tokens.toLocaleString()} | ${r.total_tokens.toLocaleString()} | $${r.est_cost.toFixed(2)} |`)
      }
    }
    return 0
  }

  const head = by === 'day'
    ? ["date", "events", "input_tokens", "output_tokens", "total_tokens", "est_cost"]
    : ["date", "model", "events", "input_tokens", "output_tokens", "total_tokens", "est_cost"]

  const data = [head, ...rows.map(r => head.map(k => k === 'est_cost' ? `$${r.est_cost.toFixed(2)}` : String((r as any)[k] ?? '')))]
  const widths = head.map((_, i) => Math.max(...data.map(row => row[i].length)))
  const fmt = (row: string[]) => row.map((v, i) => i === 0 ? v.padEnd(widths[i]) : v.padStart(widths[i])).join('  ')

  console.log(fmt(head))
  console.log(widths.map(w => '-'.repeat(w)).join('  '))
  for (const r of rows) {
    const row: string[] = [r.date]
    if (by === 'model') row.push(r.model || '')
    row.push(
      String(r.events),
      r.input_tokens.toLocaleString(),
      r.output_tokens.toLocaleString(),
      r.total_tokens.toLocaleString(),
      `$${r.est_cost.toFixed(2)}`,
    )
    console.log(fmt(row))
  }
  return 0
}

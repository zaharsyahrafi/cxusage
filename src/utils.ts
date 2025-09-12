import { promises as fs } from 'fs'
import * as path from 'path'

export async function* walk(dir: string): AsyncGenerator<string> {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const ent of entries) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      yield* walk(p)
    } else if (ent.isFile()) {
      yield p
    }
  }
}

export async function listJsonlFiles(root: string): Promise<string[]> {
  const out: string[] = []
  for await (const p of walk(root)) {
    if (p.endsWith('.jsonl')) out.push(p)
  }
  return out
}

export function formatDateInTZ(d: Date, tz?: string): string {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
    return fmt.format(d)
  } catch {
    const fmt = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' })
    return fmt.format(d)
  }
}

export function parseWhen(raw: unknown, fallback: Date): Date {
  if (raw == null) return fallback
  if (typeof raw === 'number') {
    let val = raw
    if (val > 1e12) val = val / 1e9 // ns -> s heuristic
    else if (val > 1e10) val = val / 1e3 // ms -> s
    return new Date(val * 1000)
  }
  if (typeof raw === 'string') {
    const s = raw.trim()
    if (/^\d{10,13}$/.test(s)) {
      let val = Number(s)
      if (val > 1e11) val = val / 1e3 // ms -> s
      return new Date(val * 1000)
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s)) {
      const d = new Date(s)
      if (!isNaN(d.getTime())) return d
    }
  }
  return fallback
}

export function sumKeys(obj: unknown, keys: string[]): number {
  let total = 0
  const visit = (v: unknown) => {
    if (v && typeof v === 'object') {
      if (Array.isArray(v)) {
        for (const x of v) visit(x)
      } else {
        for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
          if (keys.includes(k) && typeof val === 'number') total += val
          visit(val)
        }
      }
    }
  }
  visit(obj)
  return total
}

export function findFirst(obj: unknown, keys: string[]): unknown {
  const visit = (v: unknown): unknown => {
    if (v && typeof v === 'object') {
      if (Array.isArray(v)) {
        for (const x of v) {
          const r = visit(x)
          if (r !== undefined) return r
        }
      } else {
        const rec = v as Record<string, unknown>
        for (const k of keys) {
          if (k in rec && rec[k] !== undefined && rec[k] !== null && rec[k] !== '' ) return rec[k]
        }
        for (const val of Object.values(rec)) {
          const r = visit(val)
          if (r !== undefined) return r
        }
      }
    }
    return undefined
  }
  const r = visit(obj)
  return r === undefined ? null : r
}


"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeDaily = executeDaily;
const fs_1 = require("fs");
const path = __importStar(require("path"));
const utils_1 = require("./utils");
const pricing_1 = require("./pricing");
const DEFAULT_ROOT = path.join(process.env.HOME || process.env.USERPROFILE || '', '.codex', 'sessions');
const TOKEN_KEYS_IN = ["input_tokens", "prompt_tokens", "request_tokens"];
const TOKEN_KEYS_OUT = ["output_tokens", "completion_tokens", "response_tokens"];
const MODEL_KEYS = ["model", "model_name"];
const TIME_KEYS = ["created_at", "timestamp", "time", "ts", "created", "start_time", "end_time"];
function getEnvPrice(name, def = '0') {
    const v = process.env[name] ?? process.env[name.replace('CXUSAGE_', 'CODUSAGE_')] ?? def;
    const n = Number(v);
    return isFinite(n) ? n : 0;
}
async function executeDaily(args) {
    const root = args.root || DEFAULT_ROOT;
    const tz = args.tz;
    const by = args.by || 'day';
    const files = await (0, utils_1.listJsonlFiles)(root);
    const agg = new Map();
    const aggModel = new Map();
    let minDate = null;
    let maxDate = null;
    for (const file of files) {
        let mtime = new Date();
        try {
            const st = await fs_1.promises.stat(file);
            mtime = st.mtime;
        }
        catch { }
        const content = await fs_1.promises.readFile(file, 'utf8');
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
            const s = line.trim();
            if (!s)
                continue;
            let obj;
            try {
                obj = JSON.parse(s);
            }
            catch {
                continue;
            }
            const inTok = (0, utils_1.sumKeys)(obj, TOKEN_KEYS_IN);
            const outTok = (0, utils_1.sumKeys)(obj, TOKEN_KEYS_OUT);
            const whenRaw = (0, utils_1.findFirst)(obj, TIME_KEYS);
            const when = (0, utils_1.parseWhen)(whenRaw, mtime);
            const day = (0, utils_1.formatDateInTZ)(when, tz);
            if (!minDate || day < minDate)
                minDate = day;
            if (!maxDate || day > maxDate)
                maxDate = day;
            const model = (() => {
                const m = (0, utils_1.findFirst)(obj, MODEL_KEYS);
                return typeof m === 'string' ? m : 'unknown';
            })();
            const cur = agg.get(day) || { in: 0, out: 0, n: 0 };
            cur.in += inTok;
            cur.out += outTok;
            cur.n += 1;
            agg.set(day, cur);
            let mm = aggModel.get(day);
            if (!mm) {
                mm = new Map();
                aggModel.set(day, mm);
            }
            const curm = mm.get(model) || { in: 0, out: 0, n: 0 };
            curm.in += inTok;
            curm.out += outTok;
            curm.n += 1;
            mm.set(model, curm);
        }
    }
    const df = args.from || minDate || (0, utils_1.formatDateInTZ)(new Date(), tz);
    const dt = args.to || maxDate || (0, utils_1.formatDateInTZ)(new Date(), tz);
    // Load pricing from public API (OpenRouter models). If unavailable, costs are 0.
    const prices = await (0, pricing_1.loadPricing)();
    const rows = [];
    for (let cur = new Date(df + 'T00:00:00Z');;) {
        const curStr = (0, utils_1.formatDateInTZ)(cur, tz);
        if (curStr > dt)
            break;
        if (by === 'day') {
            const info = agg.get(curStr) || { in: 0, out: 0, n: 0 };
            if (!args.empty && info.n === 0) {
                // skip empty
            }
            else {
                const tot = info.in + info.out;
                // Sum costs across models for this day using per-model pricing
                let cost = 0;
                const mm = aggModel.get(curStr);
                if (mm) {
                    for (const [m, inf] of mm.entries()) {
                        cost += (0, pricing_1.estimateCostFor)(m, inf.in, inf.out, prices);
                    }
                }
                rows.push({
                    date: curStr,
                    events: info.n | 0,
                    input_tokens: Math.trunc(info.in),
                    output_tokens: Math.trunc(info.out),
                    total_tokens: Math.trunc(tot),
                    est_cost: cost,
                });
            }
        }
        else {
            const mm = aggModel.get(curStr);
            if (!args.empty && !mm) {
                // skip
            }
            else if (!mm || mm.size === 0) {
                rows.push({ date: curStr, model: '-', events: 0, input_tokens: 0, output_tokens: 0, total_tokens: 0, est_cost: 0 });
            }
            else {
                const arr = Array.from(mm.entries());
                arr.sort((a, b) => {
                    const ta = a[1].in + a[1].out;
                    const tb = b[1].in + b[1].out;
                    if (ta !== tb)
                        return tb - ta;
                    return a[0].localeCompare(b[0]);
                });
                for (const [m, info] of arr) {
                    const tot = info.in + info.out;
                    const cost = (0, pricing_1.estimateCostFor)(m, info.in, info.out, prices);
                    rows.push({
                        date: curStr,
                        model: m,
                        events: info.n | 0,
                        input_tokens: Math.trunc(info.in),
                        output_tokens: Math.trunc(info.out),
                        total_tokens: Math.trunc(tot),
                        est_cost: cost,
                    });
                }
            }
        }
        cur = new Date(cur.getTime() + 24 * 3600 * 1000);
    }
    if (args.json) {
        for (const r of rows)
            console.log(JSON.stringify(r));
        return 0;
    }
    if (args.md) {
        if (by === 'day') {
            console.log('| date | events | input_tokens | output_tokens | total_tokens | est_cost |');
            console.log('|---|---:|---:|---:|---:|---:|');
            for (const r of rows) {
                console.log(`| ${r.date} | ${r.events} | ${r.input_tokens.toLocaleString()} | ${r.output_tokens.toLocaleString()} | ${r.total_tokens.toLocaleString()} | $${r.est_cost.toFixed(2)} |`);
            }
        }
        else {
            console.log('| date | model | events | input_tokens | output_tokens | total_tokens | est_cost |');
            console.log('|---|---|---:|---:|---:|---:|---:|');
            for (const r of rows) {
                console.log(`| ${r.date} | ${r.model} | ${r.events} | ${r.input_tokens.toLocaleString()} | ${r.output_tokens.toLocaleString()} | ${r.total_tokens.toLocaleString()} | $${r.est_cost.toFixed(2)} |`);
            }
        }
        return 0;
    }
    const head = by === 'day'
        ? ["date", "events", "input_tokens", "output_tokens", "total_tokens", "est_cost"]
        : ["date", "model", "events", "input_tokens", "output_tokens", "total_tokens", "est_cost"];
    const data = [head, ...rows.map(r => head.map(k => k === 'est_cost' ? `$${r.est_cost.toFixed(2)}` : String(r[k] ?? '')))];
    const widths = head.map((_, i) => Math.max(...data.map(row => row[i].length)));
    const fmt = (row) => row.map((v, i) => i === 0 ? v.padEnd(widths[i]) : v.padStart(widths[i])).join('  ');
    console.log(fmt(head));
    console.log(widths.map(w => '-'.repeat(w)).join('  '));
    for (const r of rows) {
        const row = [r.date];
        if (by === 'model')
            row.push(r.model || '');
        row.push(String(r.events), r.input_tokens.toLocaleString(), r.output_tokens.toLocaleString(), r.total_tokens.toLocaleString(), `$${r.est_cost.toFixed(2)}`);
        console.log(fmt(row));
    }
    return 0;
}

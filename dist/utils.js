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
exports.walk = walk;
exports.listJsonlFiles = listJsonlFiles;
exports.formatDateInTZ = formatDateInTZ;
exports.parseWhen = parseWhen;
exports.sumKeys = sumKeys;
exports.findFirst = findFirst;
const fs_1 = require("fs");
const path = __importStar(require("path"));
async function* walk(dir) {
    let entries;
    try {
        entries = await fs_1.promises.readdir(dir, { withFileTypes: true });
    }
    catch {
        return;
    }
    for (const ent of entries) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            yield* walk(p);
        }
        else if (ent.isFile()) {
            yield p;
        }
    }
}
async function listJsonlFiles(root) {
    const out = [];
    for await (const p of walk(root)) {
        if (p.endsWith('.jsonl'))
            out.push(p);
    }
    return out;
}
function formatDateInTZ(d, tz) {
    try {
        const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
        return fmt.format(d);
    }
    catch {
        const fmt = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
        return fmt.format(d);
    }
}
function parseWhen(raw, fallback) {
    if (raw == null)
        return fallback;
    if (typeof raw === 'number') {
        let val = raw;
        if (val > 1e12)
            val = val / 1e9; // ns -> s heuristic
        else if (val > 1e10)
            val = val / 1e3; // ms -> s
        return new Date(val * 1000);
    }
    if (typeof raw === 'string') {
        const s = raw.trim();
        if (/^\d{10,13}$/.test(s)) {
            let val = Number(s);
            if (val > 1e11)
                val = val / 1e3; // ms -> s
            return new Date(val * 1000);
        }
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s)) {
            const d = new Date(s);
            if (!isNaN(d.getTime()))
                return d;
        }
    }
    return fallback;
}
function sumKeys(obj, keys) {
    let total = 0;
    const visit = (v) => {
        if (v && typeof v === 'object') {
            if (Array.isArray(v)) {
                for (const x of v)
                    visit(x);
            }
            else {
                for (const [k, val] of Object.entries(v)) {
                    if (keys.includes(k) && typeof val === 'number')
                        total += val;
                    visit(val);
                }
            }
        }
    };
    visit(obj);
    return total;
}
function findFirst(obj, keys) {
    const visit = (v) => {
        if (v && typeof v === 'object') {
            if (Array.isArray(v)) {
                for (const x of v) {
                    const r = visit(x);
                    if (r !== undefined)
                        return r;
                }
            }
            else {
                const rec = v;
                for (const k of keys) {
                    if (k in rec && rec[k] !== undefined && rec[k] !== null && rec[k] !== '')
                        return rec[k];
                }
                for (const val of Object.values(rec)) {
                    const r = visit(val);
                    if (r !== undefined)
                        return r;
                }
            }
        }
        return undefined;
    };
    const r = visit(obj);
    return r === undefined ? null : r;
}

#!/usr/bin/env node
"use strict";
/* eslint-disable no-console */
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
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const daily_1 = require("./daily");
const VERSION = '0.1.0';
function printHelp() {
    const defRoot = path.join(os.homedir(), '.codex', 'sessions');
    console.log(`usage: cxusage [daily] [--root ROOT] [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--tz TZ] [--by day|model] [--md|--json] [--empty] [--no-fallback] [--debug]\n`);
    console.log('Analyze Claude Code usage from Codex session logs.');
    console.log('\noptions:');
    console.log('  --root ROOT        Sessions root (default: ' + defRoot + ')');
    console.log('  --from DATE        Start date YYYY-MM-DD (inclusive)');
    console.log('  --to DATE          End date YYYY-MM-DD (inclusive)');
    console.log('  --tz TZ            IANA timezone, e.g. Asia/Shanghai; default local');
    console.log('  --by {day,model}   Group granularity: day (default) or model-within-day');
    console.log('  --md               Output as Markdown table');
    console.log('  --json             Output as JSON lines');
    console.log('  --empty            Show empty days (zero rows for missing days)');
    console.log('  --no-fallback      Disable pricing fallback for unknown models');
    console.log('  --debug            Print debug info about pricing/model matching');
    console.log('\ncommands:');
    console.log('  daily              Aggregate per day (optionally by model)');
}
function parseArgs(argv) {
    const out = {};
    let i = 0;
    let cmd = null;
    let help = false;
    let version = false;
    if (argv[i] && !argv[i].startsWith('-')) {
        cmd = argv[i++];
    }
    for (; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--help' || a === '-h') {
            help = true;
            continue;
        }
        if (a === '--version') {
            version = true;
            continue;
        }
        if (a === '--md') {
            out.md = true;
            continue;
        }
        if (a === '--json') {
            out.json = true;
            continue;
        }
        if (a === '--empty') {
            out.empty = true;
            continue;
        }
        if (a === '--no-fallback') {
            out.noFallback = true;
            continue;
        }
        if (a === '--debug') {
            out.debug = true;
            continue;
        }
        if (a === '--by') {
            out.by = argv[++i];
            continue;
        }
        if (a === '--root') {
            out.root = argv[++i];
            continue;
        }
        if (a === '--from') {
            out.from = argv[++i];
            continue;
        }
        if (a === '--to') {
            out.to = argv[++i];
            continue;
        }
        if (a === '--tz') {
            out.tz = argv[++i];
            continue;
        }
    }
    return { cmd, args: out, help, version };
}
async function main() {
    const { cmd, args, help, version } = parseArgs(process.argv.slice(2));
    if (version) {
        console.log('cxusage ' + VERSION);
        process.exit(0);
    }
    if (help) {
        printHelp();
        process.exit(0);
    }
    const sub = cmd || 'daily';
    switch (sub) {
        case 'daily':
            process.exit(await (0, daily_1.executeDaily)(args));
        default:
            console.error('Unknown command: ' + sub);
            printHelp();
            process.exit(2);
    }
}
main();

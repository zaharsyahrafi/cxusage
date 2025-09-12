"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeModelName = normalizeModelName;
exports.loadPricing = loadPricing;
exports.priceForModel = priceForModel;
exports.estimateCostFor = estimateCostFor;
function toNumber(x, def = 0) {
    const n = typeof x === 'string' ? Number(x) : typeof x === 'number' ? x : NaN;
    return Number.isFinite(n) ? n : def;
}
function normalizeModelName(raw) {
    let s = (raw || '').toLowerCase().trim();
    s = s.replace(/^\s+|\s+$/g, '');
    s = s.replace(/[\s_]+/g, '-');
    s = s.replace(/^(anthropic|openrouter|openai|google|azure)\//, '');
    s = s.replace(/-latest$/, '');
    // remove date suffixes like -20240620
    s = s.replace(/-20\d{6}$/, '');
    // remove version suffixes like -v1
    s = s.replace(/-v\d+$/, '');
    // map claude-3-5-* -> claude-3.5-*
    s = s.replace(/(claude-)(\d)-(\d)(?=[^-\d]|$|-)/, (_, a, b, c) => `${a}${b}.${c}`);
    return s;
}
async function loadPricing(timeoutMs = 4000) {
    const map = new Map();
    try {
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), timeoutMs);
        const res = await fetch('https://openrouter.ai/api/v1/models', { signal: ctrl.signal });
        clearTimeout(to);
        if (!res.ok)
            throw new Error(`OpenRouter models HTTP ${res.status}`);
        const j = await res.json();
        const data = Array.isArray(j?.data) ? j.data : [];
        for (const m of data) {
            const id = String(m?.id ?? '');
            const pricing = m?.pricing || {};
            const p = toNumber(pricing.prompt, NaN);
            const c = toNumber(pricing.completion, NaN);
            if (!Number.isFinite(p) && !Number.isFinite(c))
                continue;
            const key = normalizeModelName(id);
            if (!map.has(key))
                map.set(key, { inPerMTok: Number.isFinite(p) ? p : 0, outPerMTok: Number.isFinite(c) ? c : 0 });
        }
    }
    catch (e) {
        // Silent fallback: no pricing available
    }
    return map;
}
function priceForModel(prices, model) {
    const cand = [];
    const base = normalizeModelName(model);
    cand.push(base);
    // try stripping any extra suffixes beyond those normalized
    cand.push(base.replace(/-20\d{6}$/, ''));
    // try anthopic prefix variants that might appear in logs (defensive)
    cand.push(normalizeModelName('anthropic/' + base));
    // try claude-3-5 -> claude-3.5 mapping if not already handled
    if (/claude-\d-\d/.test(base))
        cand.push(base.replace(/(claude-)(\d)-(\d)/, '$1$2.$3'));
    for (const k of cand) {
        const found = prices.get(k);
        if (found)
            return found;
    }
    return undefined;
}
function estimateCostFor(model, inTokens, outTokens, prices) {
    const p = priceForModel(prices, model);
    if (!p)
        return 0;
    return (inTokens / 1e6) * p.inPerMTok + (outTokens / 1e6) * p.outPerMTok;
}

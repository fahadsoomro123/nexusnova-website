const CURRENCY_DATA_URL = 'https://nexusnovatools.com/assets/data/live-currency.json';

export const NOVA_TOOLS = Object.freeze([
  { name: 'calculator', kind: 'native', description: 'Evaluate basic arithmetic safely without executing arbitrary code.', inputSchema: { expression: 'string' }, timeoutMs: 3000, execute: executeCalculator },
  { name: 'currency_reference', kind: 'native', description: 'Read NexusNova daily reference currency data and calculate a verified conversion.', inputSchema: { amount: 'number', from: 'string', to: 'string' }, timeoutMs: 8000, execute: executeCurrency },
  { name: 'tool_handoff', kind: 'handoff', description: 'Open one explicitly allowlisted NexusNova browser capability.', inputSchema: { capability: 'string' }, timeoutMs: 1000, execute: executeHandoff }
]);

const HANDOFFS = Object.freeze({
  image_compression: { label: 'Image Compressor', href: '/image-compressor.html' },
  pdf_merge: { label: 'Merge PDF', href: '/merge-pdf.html' },
  currency_rates: { label: 'Currency Rates', href: '/currency-rates.html' },
  weather_live: { label: 'Weather Live', href: '/weather-live.html' },
  calculator: { label: 'Calculator', href: '/calculator.html' },
  network_tools: { label: 'Network Tools', href: '/network-tools.html' },
  ocr: { label: 'Image to Text OCR', href: '/image-to-text-ocr.html' },
  invoice_maker: { label: 'Invoice Maker', href: '/invoice-maker.html' },
  resume_builder: { label: 'Resume Builder', href: '/resume-builder.html' }
});

export function publicToolCatalog() {
  return NOVA_TOOLS.map(({ execute, ...tool }) => tool);
}

export async function executeToolCall(name, input = {}) {
  const tool = NOVA_TOOLS.find(item => item.name === name);
  if (!tool) return { ok: false, code: 'tool-not-allowed', userMessage: 'That capability is not connected.' };
  try { return normalizeToolResult(await withTimeout(Promise.resolve(tool.execute(input)), tool.timeoutMs)); }
  catch (error) { console.warn('Nova tool failure', { tool: name, reason: classifyToolFailure(error) }); return { ok: false, code: 'tool-failed', userMessage: 'That capability is temporarily unavailable. I did not invent a result.' }; }
}

async function executeCalculator(input) {
  const expression = String(input?.expression || '').trim();
  if (!expression || expression.length > 180) return { ok: false, code: 'invalid-input', userMessage: 'Please provide a shorter arithmetic expression.' };
  const value = safeArithmetic(expression);
  return Number.isFinite(value) ? { ok: true, value, formatted: formatNumber(value) } : { ok: false, code: 'invalid-expression', userMessage: 'I could not evaluate that arithmetic safely.' };
}

async function executeCurrency(input) {
  const amount = Number(input?.amount);
  const from = String(input?.from || '').trim().toUpperCase();
  const to = String(input?.to || '').trim().toUpperCase();
  if (!Number.isFinite(amount) || amount < 0 || amount > 1e12 || !/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) return { ok: false, code: 'invalid-input', userMessage: 'Please provide a valid amount and three-letter currency codes.' };
  try {
    const response = await fetch(CURRENCY_DATA_URL, { headers: { Accept: 'application/json' }, redirect: 'error' });
    if (!response.ok) return { ok: false, code: 'data-unavailable', userMessage: 'The daily currency reference data is unavailable. I will not guess the rate.' };
    const data = await response.json();
    const rates = new Map((Array.isArray(data?.rates) ? data.rates : []).map(row => [String(row?.code || '').toUpperCase(), Number(row?.rate)]));
    rates.set('PKR', 1);
    const fromRate = rates.get(from), toRate = rates.get(to);
    if (!Number.isFinite(fromRate) || !Number.isFinite(toRate) || fromRate <= 0 || toRate <= 0) return { ok: false, code: 'currency-unavailable', userMessage: `I do not have a verified daily reference rate for ${from} → ${to}.` };
    return { ok: true, amount, from, to, converted: (amount * fromRate) / toRate, formatted: `${formatNumber(amount)} ${from} ≈ ${formatNumber((amount * fromRate) / toRate)} ${to}`, dataDate: String(data?.data_date || ''), generatedAt: String(data?.generated_at || ''), source: String(data?.source?.name || 'NexusNova daily reference data') };
  } catch (_) { return { ok: false, code: 'data-unavailable', userMessage: 'The currency reference source could not be reached. I will not guess the rate.' }; }
}

function executeHandoff(input) {
  const key = String(input?.capability || '').trim();
  const target = HANDOFFS[key];
  return target ? { ok: true, capability: target.label, href: target.href } : { ok: false, code: 'route-not-allowed', userMessage: 'That NexusNova destination is not allowlisted.' };
}

function normalizeToolResult(result) {
  if (!result || typeof result !== 'object') return { ok: false, code: 'empty-result', userMessage: 'The capability did not return a usable result.' };
  const output = { ...result };
  if (typeof output.userMessage === 'string') output.userMessage = output.userMessage.slice(0, 1500);
  delete output.error; delete output.stack;
  return output;
}

function safeArithmetic(expression) {
  const tokens = tokenize(expression); if (!tokens) return NaN;
  const out = [], ops = [], precedence = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3 }, rightAssoc = new Set(['^']);
  let expect = true;
  for (const token of tokens) {
    if (typeof token === 'number') { out.push(token); expect = false; continue; }
    if (token === '(') { ops.push(token); expect = true; continue; }
    if (token === ')') { let found = false; while (ops.length) { const op = ops.pop(); if (op === '(') { found = true; break; } out.push(op); } if (!found || expect) return NaN; expect = false; continue; }
    if (!Object.prototype.hasOwnProperty.call(precedence, token)) return NaN;
    if (expect && (token === '+' || token === '-')) out.push(0);
    while (ops.length && ops[ops.length - 1] !== '(') { const top = ops[ops.length - 1]; if (precedence[top] > precedence[token] || (precedence[top] === precedence[token] && !rightAssoc.has(token))) out.push(ops.pop()); else break; }
    ops.push(token); expect = true;
  }
  if (expect) return NaN;
  while (ops.length) { const op = ops.pop(); if (op === '(') return NaN; out.push(op); }
  const stack = [];
  for (const token of out) { if (typeof token === 'number') { stack.push(token); continue; } const right = stack.pop(), left = stack.pop(); if (!Number.isFinite(left) || !Number.isFinite(right)) return NaN; const value = token === '+' ? left + right : token === '-' ? left - right : token === '*' ? left * right : token === '/' ? (right === 0 ? NaN : left / right) : token === '%' ? (right === 0 ? NaN : left % right) : Math.pow(left, right); if (!Number.isFinite(value) || Math.abs(value) > 1e15) return NaN; stack.push(value); }
  return stack.length === 1 ? stack[0] : NaN;
}
function tokenize(expression) {
  const normalized = expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/,/g, '').replace(/\s+/g, '');
  const tokens = []; let index = 0;
  while (index < normalized.length) { const char = normalized[index]; if (/\d|\./.test(char)) { const match = normalized.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i); if (!match) return null; const value = Number(match[0]); if (!Number.isFinite(value)) return null; tokens.push(value); index += match[0].length; continue; } if ('+-*/%^()'.includes(char)) { tokens.push(char); index += 1; continue; } return null; }
  return tokens.length ? tokens : null;
}
function formatNumber(value) { return new Intl.NumberFormat('en-PK', { maximumFractionDigits: 8 }).format(value); }
async function withTimeout(promise, timeoutMs) { let timer; const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), timeoutMs); }); try { return await Promise.race([promise, timeout]); } finally { clearTimeout(timer); } }
function classifyToolFailure(error) { return String(error?.message || '').toLowerCase().includes('timeout') ? 'timeout' : 'execution-failed'; }

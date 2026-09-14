const CURRENCY_DATA_URL = 'https://nexusnovatools.com/assets/data/live-currency.json';

export const NOVA_TOOLS = Object.freeze([
  {
    name: 'calculator',
    kind: 'native',
    description: 'Evaluate basic arithmetic safely without executing arbitrary code.',
    inputSchema: { expression: 'string' },
    timeoutMs: 3_000,
    execute: executeCalculator
  },
  {
    name: 'currency_reference',
    kind: 'native',
    description: 'Read NexusNova daily reference currency data and calculate a conversion when the requested currencies exist.',
    inputSchema: { amount: 'number', from: 'string', to: 'string' },
    timeoutMs: 8_000,
    execute: executeCurrency
  },
  {
    name: 'tool_handoff',
    kind: 'handoff',
    description: 'Open a real NexusNova browser capability when the task belongs in an existing dedicated tool.',
    inputSchema: { capability: 'string', href: 'string' },
    timeoutMs: 1_000,
    execute: executeHandoff
  }
]);

export function publicToolCatalog() {
  return NOVA_TOOLS.map(({ execute, ...tool }) => tool);
}

export async function executeToolCall(name, input = {}) {
  const tool = NOVA_TOOLS.find(item => item.name === name);
  if (!tool) return { ok: false, code: 'tool-not-allowed', userMessage: 'I do not have that capability connected yet. I can still help you choose the next step.' };
  try {
    const result = await withTimeout(Promise.resolve(tool.execute(input)), tool.timeoutMs);
    return normalizeToolResult(result);
  } catch (error) {
    console.warn('Nova tool failure', { tool: name, reason: classifyToolFailure(error) });
    return { ok: false, code: 'tool-failed', userMessage: 'That capability is temporarily unavailable. I did not invent a result; I can guide you to the closest working NexusNova tool instead.' };
  }
}

async function executeCalculator(input) {
  const expression = String(input?.expression || '').trim();
  if (!expression || expression.length > 180) return { ok: false, code: 'invalid-input', userMessage: 'Please provide a shorter arithmetic expression.' };
  const value = safeArithmetic(expression);
  if (!Number.isFinite(value)) return { ok: false, code: 'invalid-expression', userMessage: 'I could not evaluate that arithmetic safely. Please give me a simple expression such as 27 × 14.' };
  return { ok: true, value, display: formatNumber(value) };
}

async function executeCurrency(input) {
  const amount = Number(input?.amount);
  const from = String(input?.from || '').trim().toUpperCase();
  const to = String(input?.to || '').trim().toUpperCase();
  if (!Number.isFinite(amount) || amount < 0 || amount > 1e12 || !/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) {
    return { ok: false, code: 'invalid-input', userMessage: 'Please provide a valid non-negative amount and three-letter currency codes.' };
  }
  try {
    const response = await fetch(CURRENCY_DATA_URL, { headers: { Accept: 'application/json' }, redirect: 'error' });
    if (!response.ok) return { ok: false, code: 'data-unavailable', userMessage: 'The daily currency reference data is temporarily unavailable. I will not guess the rate.' };
    const data = await response.json();
    const rates = new Map((Array.isArray(data?.rates) ? data.rates : []).map(row => [String(row?.code || '').toUpperCase(), Number(row?.rate)]));
    rates.set('PKR', 1);
    const fromRate = rates.get(from);
    const toRate = rates.get(to);
    if (!Number.isFinite(fromRate) || !Number.isFinite(toRate) || fromRate <= 0 || toRate <= 0) {
      return { ok: false, code: 'currency-unavailable', userMessage: `I do not have a verified daily reference rate for ${from} → ${to} right now.` };
    }
    const converted = (amount * fromRate) / toRate;
    return {
      ok: true,
      amount,
      from,
      to,
      converted,
      formatted: `${formatNumber(amount)} ${from} ≈ ${formatNumber(converted)} ${to}`,
      dataDate: String(data?.data_date || ''),
      generatedAt: String(data?.generated_at || ''),
      source: data?.source?.name ? String(data.source.name) : 'NexusNova daily reference data'
    };
  } catch (_) {
    return { ok: false, code: 'data-unavailable', userMessage: 'The currency reference source could not be reached. I will not guess the rate.' };
  }
}

function executeHandoff(input) {
  const capability = String(input?.capability || '').trim().slice(0, 120);
  let href;
  try {
    href = new URL(String(input?.href || ''), 'https://nexusnovatools.com/');
  } catch (_) {
    return { ok: false, code: 'invalid-route', userMessage: 'I could not validate that tool destination.' };
  }
  if (href.origin !== 'https://nexusnovatools.com') return { ok: false, code: 'route-not-allowed', userMessage: 'That tool destination is not part of NexusNova.' };
  return { ok: true, capability, href: href.pathname + href.search + href.hash };
}

function normalizeToolResult(result) {
  if (!result || typeof result !== 'object') return { ok: false, code: 'empty-tool-result', userMessage: 'The capability did not return a usable result.' };
  const output = { ...result };
  if (typeof output.userMessage === 'string') output.userMessage = output.userMessage.slice(0, 1_500);
  delete output.stack;
  delete output.error;
  return output;
}

function safeArithmetic(expression) {
  const tokens = tokenize(expression);
  if (!tokens) return NaN;
  const output = [];
  const ops = [];
  const precedence = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3 };
  const rightAssoc = new Set(['^']);
  let expectValue = true;
  for (const token of tokens) {
    if (typeof token === 'number') { output.push(token); expectValue = false; continue; }
    if (token === '(') { ops.push(token); expectValue = true; continue; }
    if (token === ')') {
      let found = false;
      while (ops.length) {
        const op = ops.pop();
        if (op === '(') { found = true; break; }
        output.push(op);
      }
      if (!found || expectValue) return NaN;
      expectValue = false;
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(precedence, token)) return NaN;
    if (expectValue && (token === '+' || token === '-')) output.push(0);
    while (ops.length && ops[ops.length - 1] !== '(') {
      const top = ops[ops.length - 1];
      if (precedence[top] > precedence[token] || (precedence[top] === precedence[token] && !rightAssoc.has(token))) output.push(ops.pop());
      else break;
    }
    ops.push(token);
    expectValue = true;
  }
  if (expectValue) return NaN;
  while (ops.length) {
    const op = ops.pop();
    if (op === '(') return NaN;
    output.push(op);
  }
  const stack = [];
  for (const token of output) {
    if (typeof token === 'number') { stack.push(token); continue; }
    const right = stack.pop();
    const left = stack.pop();
    if (!Number.isFinite(left) || !Number.isFinite(right)) return NaN;
    const value = token === '+' ? left + right : token === '-' ? left - right : token === '*' ? left * right : token === '/' ? (right === 0 ? NaN : left / right) : token === '%' ? (right === 0 ? NaN : left % right) : Math.pow(left, right);
    if (!Number.isFinite(value) || Math.abs(value) > 1e15) return NaN;
    stack.push(value);
  }
  return stack.length === 1 ? stack[0] : NaN;
}

function tokenize(expression) {
  const normalized = expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/,/g, '').replace(/\s+/g, '');
  const tokens = [];
  let index = 0;
  while (index < normalized.length) {
    const char = normalized[index];
    if (/\d|\./.test(char)) {
      const match = normalized.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i);
      if (!match) return null;
      const value = Number(match[0]);
      if (!Number.isFinite(value)) return null;
      tokens.push(value); index += match[0].length; continue;
    }
    if ('+-*/%^()'.includes(char)) { tokens.push(char); index += 1; continue; }
    return null;
  }
  return tokens.length ? tokens : null;
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-PK', { maximumFractionDigits: 8 }).format(value);
}

async function withTimeout(promise, timeoutMs) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), timeoutMs); });
  try { return await Promise.race([promise, timeout]); } finally { clearTimeout(timer); }
}

function classifyToolFailure(error) {
  return String(error?.message || '').toLowerCase().includes('timeout') ? 'timeout' : 'execution-failed';
}

import { enforceAuthThrottle } from './auth-abuse.js';
import { askAi, searchWeb } from './nova-provider.js';
import { executeToolCall, publicToolCatalog } from './nova-tools.js';

const MAX_BODY_CHARS = 24000;
const MAX_MESSAGE_CHARS = 6000;
const MAX_CONTEXT_MESSAGES = 8;
const MAX_SEARCH_QUERIES = 2;
const MAX_TOOL_CALLS = 4;

const HANDOFFS = Object.freeze([
  ['image-compression', ['image compressor', 'compress image', 'compress a photo'], '/image-compressor.html', 'Image Compressor'],
  ['pdf-merge', ['merge pdf', 'combine pdf', 'join pdf'], '/merge-pdf.html', 'Merge PDF'],
  ['currency', ['currency conversion', 'convert currency', 'usd to pkr', 'dollar to rupees'], '/currency-rates.html', 'Currency Rates'],
  ['weather', ['weather', 'forecast'], '/weather-live.html', 'Weather Live'],
  ['calculator', ['calculator', 'calculate', 'math problem'], '/calculator.html', 'Calculator'],
  ['network', ['network tools', 'dns lookup', 'check my ip', 'ip address'], '/network-tools.html', 'Network Tools'],
  ['ocr', ['ocr', 'read text from image', 'image to text'], '/image-to-text-ocr.html', 'Image to Text OCR'],
  ['invoice', ['invoice', 'make an invoice'], '/invoice-maker.html', 'Invoice Maker'],
  ['resume', ['resume', 'cv builder', 'make my cv'], '/resume-builder.html', 'Resume Builder']
]);

export async function novaStatus(env) {
  const gemini = Boolean(String(env.GEMINI_API_KEY || '').trim() && String(env.GEMINI_MODEL || '').trim());
  const openai = Boolean(String(env.OPENAI_API_KEY || '').trim() && String(env.OPENAI_MODEL || '').trim());
  const search = Boolean(String(env.BRAVE_SEARCH_API_KEY || '').trim() || String(env.SEARCH_API_URL || '').trim());
  return { ok: true, aiConfigured: gemini || openai, providers: { gemini, openai }, searchConfigured: search, nativeTools: publicToolCatalog().map(item => item.name) };
}

export async function handleNovaRequest(request, env) {
  if (request.headers.get('Origin') !== 'https://nexusnovatools.com') return publicJson({ ok: false, code: 'permission-denied', error: 'Request origin is not allowed.' }, 403, request);
  const throttle = await enforceAuthThrottle(request).catch(() => ({ allowed: true }));
  if (!throttle.allowed) return publicJson({ ok: false, code: 'too-many-requests', error: 'Nova is receiving many requests. Please try again shortly.' }, 429, request, { 'Retry-After': String(throttle.retryAfter || 60) });

  let body;
  try { body = await readBody(request); } catch (error) {
    const status = error.code === 'request-too-large' ? 413 : 400;
    return publicJson({ ok: false, code: error.code || 'invalid-argument', error: status === 413 ? 'That request is too large. Please shorten it and try again.' : 'Nova could not read that request. Please try again.' }, status, request);
  }

  const message = normalizeMessage(body?.message);
  if (!message) return publicJson({ ok: false, code: 'empty-input', error: 'Tell Nova what you are trying to accomplish.' }, 400, request);

  const context = normalizeContext(body?.context);
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const diagnostics = { requestId, provider: null, tools: [], searched: false, fallback: null };

  try {
    const ai = await askAi({ env, messages: [...context, { role: 'user', content: message }], toolCatalog: publicToolCatalog() });
    if (ai.ok) {
      diagnostics.provider = ai.provider;
      const result = await executePlan(ai.plan, env, [...context, { role: 'user', content: message }], diagnostics);
      if (result) return publicJson({ ok: true, requestId, ...result, diagnostics: publicDiagnostics(diagnostics, startedAt) }, 200, request);
    }

    const fallback = nativeFallback(message);
    if (fallback) {
      diagnostics.fallback = fallback.kind;
      return publicJson({ ok: true, requestId, ...fallback, diagnostics: publicDiagnostics(diagnostics, startedAt) }, 200, request);
    }

    diagnostics.fallback = ai.reason || 'capability-limitation';
    return publicJson({
      ok: true,
      requestId,
      mode: 'limit',
      answer: ai.reason === 'provider-not-configured'
        ? 'Nova’s secure AI provider is not configured on this deployment yet. I can still route you to real NexusNova tools, and I will not pretend that an AI answer or live search happened.'
        : 'Nova could not complete that reasoning path right now. I did not invent a result. You can retry or use a relevant NexusNova tool below.',
      suggestedTools: HANDOFFS.slice(0, 6).map(item => ({ label: item[3], href: item[2] })),
      nextStep: 'Retry the request, or tell Nova the result you need and it will narrow the next step.'
    }, 200, request);
  } catch (error) {
    console.error('Nova orchestration failure', { requestId, reason: failureClass(error) });
    diagnostics.fallback = 'orchestration-error';
    return publicJson({ ok: true, requestId, mode: 'limit', answer: 'Nova hit a temporary processing problem. No unverified result was shown.', suggestedTools: HANDOFFS.slice(0, 6).map(item => ({ label: item[3], href: item[2] })), nextStep: 'Retry once; if it continues, open the closest NexusNova tool directly.' }, 200, request);
  }
}

async function executePlan(plan, env, messages, diagnostics) {
  if (!plan || typeof plan !== 'object') return null;
  const mode = ['answer', 'tool', 'search', 'multi', 'clarify', 'limit'].includes(plan.mode) ? plan.mode : 'limit';
  if (mode === 'clarify') {
    const question = String(plan.clarifyingQuestion || plan.answer || '').trim().slice(0, 1500);
    return question ? { mode: 'clarify', answer: question, nextStep: 'Reply with the missing detail and Nova will continue from this conversation.' } : null;
  }

  const tools = [];
  if (mode === 'tool' || mode === 'multi') {
    for (const call of Array.isArray(plan.toolCalls) ? plan.toolCalls.slice(0, MAX_TOOL_CALLS) : []) {
      const name = String(call?.name || '');
      if (!publicToolCatalog().some(item => item.name === name)) continue;
      const result = await executeToolCall(name, sanitizeInput(call?.input));
      diagnostics.tools.push(name);
      tools.push({ name, result });
    }
  }

  const searches = [];
  if (mode === 'search' || mode === 'multi') {
    for (const query of (Array.isArray(plan.searchQueries) ? plan.searchQueries : []).map(value => String(value || '').trim()).filter(Boolean).slice(0, MAX_SEARCH_QUERIES)) {
      const result = await searchWeb({ env, query, count: 5 });
      diagnostics.searched = true;
      searches.push({ query, ...result });
    }
  }

  const goodTools = tools.filter(item => item.result?.ok);
  const goodSearches = searches.filter(item => item.ok && item.results?.length);
  if ((mode === 'search' || mode === 'multi') && plan.needsCurrentInfo && !goodSearches.length) {
    return { mode: 'limit', answer: 'I need live verification for that request, but the live search connection is unavailable right now. I will not present guessed or stale information as current.', nextStep: 'Retry when live search is available, or ask for a non-current explanation.' };
  }
  if (goodTools.length || goodSearches.length) {
    const synthesized = await synthesize(env, messages, plan, goodTools, goodSearches);
    if (synthesized) return synthesized;
    return { mode: goodSearches.length ? 'search' : 'tool', answer: safeSummary(plan, goodTools, goodSearches), sources: goodSearches.flatMap(item => item.results).slice(0, 8) };
  }
  const answer = String(plan.answer || '').trim().slice(0, 8000);
  return answer ? { mode, answer } : null;
}

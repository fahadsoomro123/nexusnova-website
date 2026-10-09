import { askGemini, providerStatus } from './nova-provider.js';

const ALLOWED_ORIGIN = 'https://nexusnovatools.com';
const MAX_BODY = 12000;
const MAX_MESSAGE = 4000;
const MAX_CONTEXT = 8;
const rateBuckets = new Map();

export async function novaRequest(request, env) {
  const originError = validateOrigin(request);
  if (originError) return novaJson(request, { ok: false, code: 'permission-denied', error: originError }, 403);
  if (request.method === 'OPTIONS') return novaCors(request, new Response(null, { status: 204 }));
  if (request.method === 'GET') return novaStatus(request, env);
  if (request.method !== 'POST') return novaJson(request, { ok: false, code: 'method-not-allowed' }, 405);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const now = Date.now();
  const bucket = rateBuckets.get(ip) || { start: now, count: 0 };
  if (now - bucket.start > 60_000) { bucket.start = now; bucket.count = 0; }
  bucket.count += 1;
  rateBuckets.set(ip, bucket);
  if (bucket.count > 20) return novaJson(request, { ok: false, code: 'rate-limited', error: 'Please wait briefly and try again.' }, 429);

  let body;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) throw new Error('too-large');
    body = JSON.parse(text || '{}');
  } catch (_) {
    return novaJson(request, { ok: false, code: 'invalid-argument', error: 'The request is invalid or too large.' }, 400);
  }

  const message = String(body.message || body.prompt || '').trim().slice(0, MAX_MESSAGE);
  if (!message) return novaJson(request, { ok: false, code: 'invalid-argument', error: 'Enter a request for Nova.' }, 400);
  const context = Array.isArray(body.context) ? body.context.slice(-MAX_CONTEXT) : [];
  const prompt = [
    'You are Nova, a careful general-purpose assistant for NexusNova Tools.',
    'Answer the user directly and honestly. Do not claim live data, tool execution, or sources unless provided.',
    'Keep the answer concise and useful. User request:',
    message,
    context.length ? `Recent conversation:\n${JSON.stringify(context)}` : ''
  ].filter(Boolean).join('\n\n');

  const result = await askGemini(prompt, env);
  if (!result.ok) {
    console.warn('Nova provider failure', { code: result.code });
    return novaJson(request, {
      ok: false,
      requestId: crypto.randomUUID(),
      mode: 'limit',
      answer: 'Nova could not complete that request right now. No unverified result was shown. Please retry.',
      code: 'provider-unavailable'
    }, 503);
  }
  return novaJson(request, {
    ok: true,
    requestId: crypto.randomUUID(),
    mode: 'answer',
    answer: result.answer,
    provider: result.provider,
    action: null,
    sources: [],
    suggestedTools: [],
    nextStep: ''
  });
}

function novaStatus(request, env) {
  const providers = providerStatus(env);
  return novaJson(request, {
    ok: true,
    aiConfigured: providers.gemini || providers.openai,
    providers
  });
}

function validateOrigin(request) {
  return request.headers.get('Origin') === ALLOWED_ORIGIN ? '' : 'Request origin is not allowed.';
}

function novaCors(request, response) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Vary', 'Origin');
  return new Response(response.body, { status: response.status, headers });
}

function novaJson(request, body, status = 200) {
  return novaCors(request, new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  }));
}

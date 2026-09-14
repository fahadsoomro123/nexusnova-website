import base from './worker-instagram-entry.js';
import { handleNovaRequest, novaStatus } from './nova-orchestrator.js';

const NOVA_PATH = '/api/nova';
const NOVA_STATUS_PATH = '/api/nova/status';
const ORIGIN = 'https://nexusnovatools.com';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === NOVA_PATH || url.pathname === NOVA_STATUS_PATH) {
      if (request.method === 'OPTIONS') return novaCors(request, new Response(null, { status: 204 }));
      if (request.method === 'GET' && url.pathname === NOVA_STATUS_PATH) return novaJson(novaStatus(env), 200, request);
      if (request.method === 'POST' && url.pathname === NOVA_PATH) {
        try {
          const result = await runNovaSafely(request, env);
          return novaJson(result.body, result.status, request, result.headers);
        } catch (error) {
          console.error('Nova edge failure', { type: error?.name || 'Error' });
          return novaJson({ ok: true, mode: 'limit', answer: 'Nova is temporarily unavailable. No unverified result was shown.', nextStep: 'Please retry or open a relevant NexusNova tool.' }, 200, request);
        }
      }
      return novaJson({ ok: false, code: 'method-not-allowed', error: 'Nova accepts a text request here.' }, 405, request, { Allow: 'GET, POST, OPTIONS' });
    }
    return base.fetch(request, env, ctx);
  }
};

async function runNovaSafely(request, env) {
  const result = await handleNovaRequest(request, env);
  return { status: result.status, body: result.body || { ok: result.ok } };
}

function novaCors(request, response) {
  const headers = new Headers(response.headers);
  if (request.headers.get('Origin') === ORIGIN) {
    headers.set('Access-Control-Allow-Origin', ORIGIN);
    headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    headers.set('Access-Control-Max-Age', '600');
    headers.set('Vary', 'Origin');
  }
  return new Response(response.body, { status: response.status, headers });
}

function novaJson(data, status, request, extra = {}) {
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra });
  if (request.headers.get('Origin') === ORIGIN) {
    headers.set('Access-Control-Allow-Origin', ORIGIN);
    headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    headers.set('Vary', 'Origin');
  }
  return new Response(JSON.stringify(data), { status, headers });
}

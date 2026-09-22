import workerEntry from './worker-entry.js';
import { instagramAccountRequest } from './instagram-account-v2.js';
import { createInstagramAuthorization, validateInstagramLinkRequest } from './instagram-oauth-state.js';
import { runNova, novaStatus } from './nova/nova-runtime.js';
export { NovaProviderGate } from './nova/nova-provider-gate.js';

const ALLOWED_ORIGIN = 'https://nexusnovatools.com';
const INSTAGRAM_START_PATH = '/api/instagram/start';
const INSTAGRAM_STATUS_PATH = '/api/instagram/status';
const INSTAGRAM_LINK_PATH = '/api/instagram/link';
const NOVA_PATH = '/api/nova';
const NOVA_STATUS_PATH = '/api/nova/status';
const ASTRONOMY_PROXY_PATH = '/api/astronomy/query';
const ASTRONOMY_MAX_BODY_BYTES = 48000;
const ASTRONOMY_MAX_QUERY_CHARS = 26000;
const ASTRONOMY_MAX_RESPONSE_BYTES = 4 * 1024 * 1024;


export default { async fetch(request, env, ctx) { const url = new URL(request.url); if (url.pathname === ASTRONOMY_PROXY_PATH) return astronomyProxy(request); const originApi = url.pathname.startsWith('/api/instagram/') || url.pathname === NOVA_PATH || url.pathname === NOVA_STATUS_PATH; if (!originApi) return workerEntry.fetch(request, env, ctx); if (request.method === 'OPTIONS') return sharedCors(request, new Response(null, { status: 204 })); if (request.headers.get('Origin') !== ALLOWED_ORIGIN) return jsonResponse(request, { ok: false, code: 'permission-denied', error: 'Request origin is not allowed.' }, 403); if (request.method === 'GET' && url.pathname === NOVA_STATUS_PATH) return jsonResponse(request, await novaStatus(env)); if (request.method === 'POST' && url.pathname === NOVA_PATH) { try { const result = await runNova(request, env); return jsonResponse(request, result.body || { ok: result.ok }, result.status); } catch (error) { console.error('Unhandled Nova route error:', error instanceof Error ? error.message : 'Unknown error'); return jsonResponse(request, { ok: true, mode: 'limit', answer: 'Nova is temporarily unavailable. No unverified result was shown.', nextStep: 'Please retry or open a relevant NexusNOVA tool.' }, 200); } } const supported = (request.method === 'POST' && url.pathname === INSTAGRAM_START_PATH) || (request.method === 'GET' && url.pathname === INSTAGRAM_STATUS_PATH) || (request.method === 'POST' && url.pathname === INSTAGRAM_LINK_PATH); if (!supported) return jsonResponse(request, { ok: false, code: 'not-found', error: 'API route not found.' }, 404); try { if (request.method === 'POST' && url.pathname === INSTAGRAM_START_PATH) return jsonResponse(request, await createInstagramAuthorization(request, env)); let verifiedRequest = request; if (request.method === 'POST' && url.pathname === INSTAGRAM_LINK_PATH) verifiedRequest = await validateInstagramLinkRequest(request, env); return sharedCors(request, await instagramAccountRequest(verifiedRequest, env)); } catch (error) { const status = Number(error?.status || 0); const code = String(error?.code || '').trim(); const publicMessage = String(error?.publicMessage || '').trim(); if (status >= 400 && status <= 599 && code && publicMessage) return jsonResponse(request, { ok: false, code, error: publicMessage }, status); console.error('Unhandled Instagram route error:', error instanceof Error ? error.message : 'Unknown error'); return jsonResponse(request, { ok: false, code: 'internal', error: 'Instagram account linking is temporarily unavailable.' }, 502); } } };
async function astronomyProxy(request) {
  if (request.method === 'OPTIONS') return sharedCors(request, new Response(null, { status: 204 }));
  if (request.headers.get('Origin') !== ALLOWED_ORIGIN) {
    return jsonResponse(request, { ok: false, code: 'permission-denied', error: 'Request origin is not allowed.' }, 403);
  }
  if (request.method !== 'POST') {
    return jsonResponse(request, { ok: false, code: 'method-not-allowed', error: 'Use POST for astronomy queries.' }, 405);
  }
  const declaredLength = Number(request.headers.get('Content-Length') || 0);
  if (declaredLength > ASTRONOMY_MAX_BODY_BYTES) {
    return jsonResponse(request, { ok: false, code: 'request-too-large', error: 'Astronomy query is too large.' }, 413);
  }
  let body;
  try {
    const text = await request.text();
    if (text.length > ASTRONOMY_MAX_BODY_BYTES) throw new Error('request-too-large');
    body = JSON.parse(text || '{}');
  } catch (_) {
    return jsonResponse(request, { ok: false, code: 'invalid-argument', error: 'Astronomy query body is invalid.' }, 400);
  }

  const source = String(body?.source || '').trim().toLowerCase();
  const query = String(body?.query || '').trim();
  if (!/^(gaia|exo|ned|sdss|desi)$/.test(source) || !query || query.length > ASTRONOMY_MAX_QUERY_CHARS) {
    return jsonResponse(request, { ok: false, code: 'invalid-argument', error: 'Unsupported or invalid astronomy source query.' }, 400);
  }

  let upstream;
  let init = { method: 'GET', redirect: 'error', headers: { Accept: 'application/json' } };

  if (source === 'sdss') {
    let sdssUrl;
    try { sdssUrl = new URL(query); } catch (_) {
      return jsonResponse(request, { ok: false, code: 'invalid-argument', error: 'Invalid SDSS query URL.' }, 400);
    }
    if (sdssUrl.protocol !== 'https:' || sdssUrl.hostname !== 'skyserver.sdss.org' ||
        !/^\/dr20\/SkyServerWS\/SearchTools\/RadialSearch$/i.test(sdssUrl.pathname)) {
      return jsonResponse(request, { ok: false, code: 'invalid-argument', error: 'SDSS endpoint is not allowlisted.' }, 400);
    }
    const radius = Number(sdssUrl.searchParams.get('radius') || 0);
    const limit = Number(sdssUrl.searchParams.get('limit') || 0);
    if (!Number.isFinite(radius) || radius <= 0 || radius > 2.5 || !Number.isInteger(limit) || limit < 1 || limit > 250) {
      return jsonResponse(request, { ok: false, code: 'invalid-argument', error: 'SDSS query limits are outside the safe range.' }, 400);
    }
    upstream = sdssUrl.toString();
  } else {
    const endpoint = {
      gaia: 'https://gea.esac.esa.int/tap-server/tap/sync',
      exo: 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync',
      ned: 'https://ned.ipac.caltech.edu/tap/sync',
      desi: 'https://datalab.noirlab.edu/tap/sync'
    }[source];

    const requiredTable = {
      gaia: /\bFROM\s+gaiadr3\.gaia_source\b/i,
      exo: /\bFROM\s+pscomppars\b/i,
      ned: /\bFROM\s+objdir\b/i,
      desi: /\bFROM\s+desi_dr1\.zpix\b/i
    }[source];
    const topLimit = { gaia: 1200, exo: 700, ned: 250, desi: 250 }[source];
    const topMatch = query.match(/\bTOP\s+(\d+)\b/i);
    if (!requiredTable.test(query) || !topMatch || Number(topMatch[1]) < 1 || Number(topMatch[1]) > topLimit || !/^\s*SELECT\b/i.test(query)) {
      return jsonResponse(request, { ok: false, code: 'invalid-argument', error: 'Astronomy query does not match the allowlisted public catalog shape.' }, 400);
    }

    const url = new URL(endpoint);
    url.searchParams.set('REQUEST', 'doQuery');
    url.searchParams.set('LANG', 'ADQL');
    url.searchParams.set('FORMAT', 'json');
    if (source === 'exo') {
      url.searchParams.delete('REQUEST');
      url.searchParams.delete('LANG');
      url.searchParams.set('query', query);
      url.searchParams.set('format', 'json');
    } else {
      url.searchParams.set('QUERY', query);
    }
    upstream = url.toString();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  let response;
  try {
    response = await fetch(upstream, { ...init, signal: controller.signal });
  } catch (_) {
    return jsonResponse(request, { ok: false, code: 'upstream-unavailable', error: 'Public astronomy source is temporarily unavailable.' }, 502);
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    return jsonResponse(request, { ok: false, code: 'upstream-unavailable', error: 'Public astronomy source is temporarily unavailable.' }, 502);
  }
  const bodyBytes = await response.arrayBuffer();
  if (bodyBytes.byteLength > ASTRONOMY_MAX_RESPONSE_BYTES) {
    return jsonResponse(request, { ok: false, code: 'response-too-large', error: 'Public astronomy response exceeded the safe size limit.' }, 502);
  }
  const headers = new Headers();
  headers.set('Content-Type', response.headers.get('Content-Type') || 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-NexusNova-Source-Proxy', source);
  return sharedCors(request, new Response(bodyBytes, { status: 200, headers }));
}

function sharedCors(request, response) { const headers = new Headers(response.headers); if (request.headers.get('Origin') === ALLOWED_ORIGIN) { headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN); headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type'); headers.set('Access-Control-Max-Age', '600'); headers.set('Vary', 'Origin'); } headers.set('Cache-Control', 'no-store'); headers.set('X-Content-Type-Options', 'nosniff'); return new Response(response.body, { status: response.status, statusText: response.statusText, headers }); }
function jsonResponse(request, body, status = 200) { return sharedCors(request, new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } })); }
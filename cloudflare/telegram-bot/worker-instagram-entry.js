import workerEntry from './worker-entry.js';
import { instagramAccountRequest } from './instagram-account-v2.js';
import { createInstagramAuthorization, validateInstagramLinkRequest } from './instagram-oauth-state.js';

const ALLOWED_ORIGIN = 'https://nexusnovatools.com';
const INSTAGRAM_START_PATH = '/api/instagram/start';
const INSTAGRAM_STATUS_PATH = '/api/instagram/status';
const INSTAGRAM_LINK_PATH = '/api/instagram/link';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const instagramPath = url.pathname.startsWith('/api/instagram/');
    if (!instagramPath) return workerEntry.fetch(request, env, ctx);

    if (request.method === 'OPTIONS') {
      return instagramCors(request, new Response(null, { status: 204 }));
    }

    if (request.headers.get('Origin') !== ALLOWED_ORIGIN) {
      return instagramJson(request, {
        ok: false,
        code: 'permission-denied',
        error: 'Request origin is not allowed.'
      }, 403);
    }

    const supported =
      (request.method === 'POST' && url.pathname === INSTAGRAM_START_PATH) ||
      (request.method === 'GET' && url.pathname === INSTAGRAM_STATUS_PATH) ||
      (request.method === 'POST' && url.pathname === INSTAGRAM_LINK_PATH);
    if (!supported) {
      return instagramJson(request, { ok: false, code: 'not-found', error: 'Instagram API route not found.' }, 404);
    }

    try {
      if (request.method === 'POST' && url.pathname === INSTAGRAM_START_PATH) {
        return instagramJson(request, await createInstagramAuthorization(request, env));
      }

      let verifiedRequest = request;
      if (request.method === 'POST' && url.pathname === INSTAGRAM_LINK_PATH) {
        verifiedRequest = await validateInstagramLinkRequest(request, env);
      }
      return instagramCors(request, await instagramAccountRequest(verifiedRequest, env));
    } catch (error) {
      const status = Number(error?.status || 0);
      const code = String(error?.code || '').trim();
      const publicMessage = String(error?.publicMessage || '').trim();
      if (status >= 400 && status <= 599 && code && publicMessage) {
        return instagramJson(request, { ok: false, code, error: publicMessage }, status);
      }
      console.error('Unhandled Instagram route error:', error instanceof Error ? error.message : 'Unknown error');
      return instagramJson(request, {
        ok: false,
        code: 'internal',
        error: 'Instagram account linking is temporarily unavailable.'
      }, 502);
    }
  }
};

function instagramCors(request, response) {
  const headers = new Headers(response.headers);
  if (request.headers.get('Origin') === ALLOWED_ORIGIN) {
    headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    headers.set('Access-Control-Max-Age', '600');
    headers.set('Vary', 'Origin');
  }
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function instagramJson(request, body, status = 200) {
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
  return instagramCors(request, new Response(JSON.stringify(body), { status, headers }));
}

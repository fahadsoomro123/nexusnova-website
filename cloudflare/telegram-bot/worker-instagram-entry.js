import workerEntry from './worker-entry.js';
import { instagramAccountRequest } from './instagram-account.js';

const ALLOWED_ORIGIN = 'https://nexusnovatools.com';
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
      (request.method === 'GET' && url.pathname === INSTAGRAM_STATUS_PATH) ||
      (request.method === 'POST' && url.pathname === INSTAGRAM_LINK_PATH);
    if (!supported) {
      return instagramJson(request, { ok: false, code: 'not-found', error: 'Instagram API route not found.' }, 404);
    }

    return instagramCors(request, await instagramAccountRequest(request, env));
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
  return instagramCors(request, Response.json(body, { status }));
}

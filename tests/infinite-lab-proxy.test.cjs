'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');

const source = fs.readFileSync(path.join(__dirname, '../cloudflare/telegram-bot/worker-instagram-entry.js'), 'utf8');
const runnable = source
  .replace(/^import workerEntry from '\.\/worker-entry\.js';$/m, 'const workerEntry = { fetch() { return new Response("delegate"); } };')
  .replace(/^import .*instagram-account-v2\.js';$/m, 'const instagramAccountRequest = async () => new Response("{}");')
  .replace(/^import .*instagram-oauth-state\.js';$/m, 'const createInstagramAuthorization = async () => new Response("{}"); const validateInstagramLinkRequest = async request => request;')
  .replace(/^import .*nova\/nova-runtime\.js';$/m, 'const runNova = async () => ({ ok: true }); const novaStatus = async () => ({ ok: true });')
  .replace(/^export \{ NovaProviderGate.*$/m, '')
  .replace('export default {', 'globalThis.__entry = {');
const calls = [];
const context = {
  crypto: webcrypto,
  fetch: async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ fields: ['id'], data: [['fixture']] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  },
  Request, Response, Headers, URL, URLSearchParams, TextEncoder, TextDecoder, AbortController,
  setTimeout, clearTimeout, console: { error() {}, warn() {} }
};
vm.runInNewContext(runnable + '\nglobalThis.__astronomyProxy = astronomyProxy;', context, { filename: 'worker-instagram-entry.js' });

function req(body, origin = 'https://nexusnovatools.com', method = 'POST') {
  return new Request('https://nexusnova-telegram-bot.fahadsoomro123.workers.dev/api/astronomy/query', {
    method,
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(body) : undefined
  });
}

test('astronomy proxy accepts allowlisted Gaia query and adds CORS/source headers', async () => {
  calls.length = 0;
  const response = await context.__astronomyProxy(req({ source: 'gaia', query: "SELECT TOP 12 source_id,ra,dec FROM gaiadr3.gaia_source WHERE parallax>0" }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://nexusnovatools.com');
  assert.equal(response.headers.get('X-NexusNova-Source-Proxy'), 'gaia');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /gea\.esac\.esa\.int\/tap-server\/tap\/sync/);
  assert.match(calls[0].url, /gaiadr3\.gaia_source/);
});

test('astronomy proxy rejects arbitrary source and arbitrary SDSS endpoint', async () => {
  calls.length = 0;
  const badSource = await context.__astronomyProxy(req({ source: 'evil', query: 'SELECT TOP 1 * FROM anything' }));
  assert.equal(badSource.status, 400);
  const badSdss = await context.__astronomyProxy(req({ source: 'sdss', query: 'https://example.com/steal?radius=1&limit=1' }));
  assert.equal(badSdss.status, 400);
  assert.equal(calls.length, 0);
});

test('astronomy proxy enforces safe SDSS range and ADQL table limits', async () => {
  const badRadius = await context.__astronomyProxy(req({ source: 'sdss', query: 'https://skyserver.sdss.org/dr20/SkyServerWS/SearchTools/RadialSearch?ra=1&dec=2&radius=9&limit=10&format=json' }));
  assert.equal(badRadius.status, 400);
  const badTop = await context.__astronomyProxy(req({ source: 'ned', query: "SELECT TOP 9999 prefname,ra,dec FROM objdir" }));
  assert.equal(badTop.status, 400);
});

test('astronomy proxy rejects wrong-origin access and oversized bodies', async () => {
  const wrongOrigin = await context.__astronomyProxy(req({ source: 'gaia', query: "SELECT TOP 1 source_id FROM gaiadr3.gaia_source" }, 'https://evil.example'));
  assert.equal(wrongOrigin.status, 403);
  const oversized = await context.__astronomyProxy(req({ source: 'gaia', query: 'SELECT TOP 1 source_id FROM gaiadr3.gaia_source ' + 'x'.repeat(50000) }));
  assert.equal(oversized.status, 413);
});
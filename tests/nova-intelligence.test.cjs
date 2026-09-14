const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Nova frontend is domain-owned, secure, bounded and stateful', () => {
  const source = read('assets/nova/nova-ui.js');
  assert.match(source, /workers\.dev\/api\/nova/);
  assert.match(source, /sessionStorage/);
  assert.match(source, /MAX_CONTEXT_CHARS=9000/);
  assert.match(source, /CLIENT_TIMEOUT_MS=90000/);
  assert.match(source, /SUBMITTING|PROCESSING|STILL WORKING/);
  assert.match(source, /navigator\.clipboard/);
  assert.match(source, /renderMarkdown/);
  assert.match(source, /<table|createElement\('table'\)|ni-table/);
  assert.doesNotMatch(source, /GEMINI_API_KEY|OPENAI_API_KEY|BRAVE_SEARCH_API_KEY/);
  assert.match(source, /textContent/);
  assert.doesNotMatch(source, /\.innerHTML/);
});

test('Nova backend is physically isolated from the shared Worker router', () => {
  const provider = read('cloudflare/telegram-bot/nova/nova-provider.js');
  const tools = read('cloudflare/telegram-bot/nova/nova-tools.js');
  const runtime = read('cloudflare/telegram-bot/nova/nova-runtime.js');
  const abuse = read('cloudflare/telegram-bot/nova/nova-abuse.js');
  const entry = read('cloudflare/telegram-bot/worker-instagram-entry.js');
  const wrangler = read('cloudflare/telegram-bot/wrangler.jsonc');
  assert.match(provider, /export async function askAi/);
  assert.match(provider, /GEMINI_API_KEY/);
  assert.match(provider, /OPENAI_API_KEY/);
  assert.match(provider, /store:\s*false/);
  assert.match(tools, /export const NOVA_TOOLS/);
  assert.match(tools, /safeArithmetic/);
  assert.match(runtime, /enforceNovaThrottle/);
  assert.match(runtime, /publicToolCatalog\(\)\.some/);
  assert.match(runtime, /No unverified result/);
  assert.match(abuse, /SHORT_WINDOW_LIMIT = 24/);
  assert.match(entry, /\.\/nova\/nova-runtime\.js/);
  assert.match(wrangler, /"main":\s*"worker-instagram-entry\.js"/);
});

test('Nova production HTML owns only Nova assets and keeps product surface noindex', () => {
  const html = read('nova-intelligence.html');
  assert.match(html, /<meta name="robots" content="noindex,nofollow">/i);
  assert.match(html, /assets\/nova\/nova-intelligence\.css/);
  assert.match(html, /assets\/nova\/nova-ui\.js/);
  assert.match(html, /id="niPrompt"/);
  assert.match(html, /id="niBuild"/);
  assert.match(html, /id="niResult"/);
  assert.match(html, /id="niState"/);
});

test('Superseded Nova asset paths are no longer active', () => {
  assert.equal(fs.existsSync(path.join(root, 'assets/js/nova-intelligence.js')), false);
  assert.equal(fs.existsSync(path.join(root, 'assets/nova/nova-ui.js')), true);
  assert.equal(fs.existsSync(path.join(root, 'cloudflare/telegram-bot/nova/nova-runtime.js')), true);
});

test('Nova files pass Node syntax parsing', () => {
  for (const file of [
    'assets/nova/nova-ui.js',
    'cloudflare/telegram-bot/nova/nova-provider.js',
    'cloudflare/telegram-bot/nova/nova-tools.js',
    'cloudflare/telegram-bot/nova/nova-runtime.js',
    'cloudflare/telegram-bot/nova/nova-abuse.js',
    'cloudflare/telegram-bot/worker-instagram-entry.js'
  ]) execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'pipe' });
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Nova frontend uses the secure orchestration API and bounded session context', () => {
  const source = read('assets/js/nova-intelligence.js');
  assert.match(source, /workers\.dev\/api\/nova/);
  assert.match(source, /sessionStorage/);
  assert.match(source, /slice\(-MAX_HISTORY\)/);
  assert.match(source, /function requestContext\s*\(\)/);
  assert.match(source, /MAX_CONTEXT_CHARS\s*=\s*9000/);
  assert.match(source, /context:\s*requestContext\(\)/);
  assert.doesNotMatch(source, /request too broad for this preview router/i);
  assert.doesNotMatch(source, /CAPABILITIES\s*=|patterns\s*:/);
  assert.match(source, /textContent/);
  assert.doesNotMatch(source, /innerHTML/);
});

test('Nova worker exposes separated provider, tools, runtime and existing entrypoint layers', () => {
  const provider = read('cloudflare/telegram-bot/nova-provider.js');
  const tools = read('cloudflare/telegram-bot/nova-tools.js');
  const runtime = read('cloudflare/telegram-bot/nova-runtime.js');
  const entry = read('cloudflare/telegram-bot/worker-instagram-entry.js');
  const wrangler = read('cloudflare/telegram-bot/wrangler.jsonc');
  assert.match(provider, /export async function askAi/);
  assert.match(provider, /export async function searchWeb/);
  assert.match(provider, /GEMINI_API_KEY/);
  assert.match(provider, /OPENAI_API_KEY/);
  assert.match(provider, /store:\s*false/);
  assert.match(tools, /export const NOVA_TOOLS/);
  assert.match(tools, /tool_handoff/);
  assert.match(tools, /safeArithmetic/);
  assert.match(runtime, /slice\(-8\)/);
  assert.match(runtime, /slice\(0, 4\)/);
  assert.match(runtime, /slice\(0, 2\)/);
  assert.match(runtime, /publicToolCatalog\(\)\.some/);
  assert.match(runtime, /No unverified result/);
  assert.match(entry, /\/api\/nova/);
  assert.match(entry, /runNova|novaStatus/);
  assert.match(wrangler, /"main":\s*"worker-instagram-entry\.js"/);
});

test('Nova hardening contains no client-side provider secrets or raw technical fallback', () => {
  const source = read('assets/js/nova-intelligence.js');
  assert.doesNotMatch(source, /GEMINI_API_KEY|OPENAI_API_KEY|BRAVE_SEARCH_API_KEY/);
  assert.doesNotMatch(source, /stack trace|JSON parse error|HTTP 500|Error 500/i);
  assert.match(source, /No fake answer was generated/);
});

test('Nova production HTML preserves noindex and contains the working prompt surface', () => {
  const html = read('nova-intelligence.html');
  assert.match(html, /<meta name="robots" content="noindex,nofollow">/i);
  assert.match(html, /id="niPrompt"/);
  assert.match(html, /id="niBuild"/);
  assert.match(html, /id="niResult"/);
});

test('Nova worker files pass Node syntax parsing', () => {
  for (const file of [
    'assets/js/nova-intelligence.js',
    'cloudflare/telegram-bot/nova-provider.js',
    'cloudflare/telegram-bot/nova-tools.js',
    'cloudflare/telegram-bot/nova-runtime.js',
    'cloudflare/telegram-bot/worker-instagram-entry.js'
  ]) {
    execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'pipe' });
  }
});

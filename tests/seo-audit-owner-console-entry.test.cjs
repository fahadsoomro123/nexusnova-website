'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const auditHtml = fs.readFileSync(path.join(root, 'seo-audit-studio.html'), 'utf8');
const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const adminHtml = fs.readFileSync(path.join(root, 'seo-audit-studio-admin.html'), 'utf8');

test('Audit Studio footer exposes a clear Owner Console entry without exposing credentials', () => {
  assert.match(auditHtml, /<a href="\/seo-audit-studio-admin\.html" rel="nofollow" aria-label="Owner-only SEO Audit Studio administration">Owner Console<\/a>/);
  assert.match(homepage, /href="\/seo-audit-studio-admin\.html"[^>]*>Owner Console<\/a>/, 'homepage exposes Owner Console next to Open Audit Studio');
  assert.match(adminHtml, /<meta name="robots" content="noindex,nofollow,noarchive">/);
  assert.match(adminHtml, /<input id="ownerTokenInput" type="password"/);
  assert.match(adminHtml, /headers\.set\('X-Owner-Admin-Token',state\.token\)/);
  assert.doesNotMatch(adminHtml, /(?:gho_|sk_live_|whsec_)[A-Za-z0-9_-]{12,}/);
});

test('shared shell synchronization preserves the page-specific Owner Console entry', () => {
  const { spawnSync } = require('node:child_process');
  const python = [
    'import importlib.util, sys',
    'spec = importlib.util.spec_from_file_location("shell_sync", sys.argv[1])',
    'module = importlib.util.module_from_spec(spec)',
    'spec.loader.exec_module(module)',
    "source = '<!doctype html><html><head></head><body><header>Old header</header><main><p>Audit Studio</p></main><footer><nav><a href=\"/seo-audit-studio-admin.html\" rel=\"nofollow\" aria-label=\"Owner-only SEO Audit Studio administration\">Owner Console</a></nav></footer></body></html>'",
    "header = '<header><a href=\"/\">Home</a></header>'",
    "footer = '<footer><nav aria-label=\"Trust and policies\"><a href=\"/privacy.html\">Privacy</a></nav></footer>'",
    'print(module.normalize_html(source, header, footer))'
  ].join('\\n');
  const result = spawnSync(process.env.PYTHON || 'python3', [
    '-c', python, path.join(root, '.github/scripts/sync_static_site_shell.py')
  ], { cwd: root, encoding: 'utf8', timeout: 15000 });
  assert.equal(result.error, undefined, 'shell-sync test process did not start: ' + (result.error?.message || ''));
  assert.equal(result.status, 0, 'shell-sync fixture failed:\\n' + result.stdout + '\\n' + result.stderr);
  assert.ok(
    result.stdout.includes('href="/seo-audit-studio-admin.html" rel="nofollow" aria-label="Owner-only SEO Audit Studio administration">Owner Console</a>'),
    'the shared public footer must not erase the page-specific Owner Console entry'
  );
});


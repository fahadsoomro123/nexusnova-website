const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('app preview loads the shared consent UI during the initial deferred script pass', () => {
  const html = fs.readFileSync('app.html', 'utf8');
  const main = '<script src="assets/js/main.js?v=20261015-v4" defer></script>';
  const shell = '<script src="assets/js/site-main.js?v=20261018-app-consent-lcp-v1" defer data-nexusnova-site-shell></script>';
  assert.ok(html.includes(main), 'the shared runtime remains loaded');
  assert.ok(html.includes(shell), 'site-main consent UI is loaded from the HTML instead of waiting for requestIdleCallback');
  assert.ok(html.indexOf(main) < html.indexOf(shell), 'the direct shell tag follows main.js, so its marker prevents a duplicate idle load');
});

test('indexed-tool audit accepts only the intentional shared-shell cache version exception', () => {
  const workflow = fs.readFileSync('.github/workflows/total-site-overhaul.yml', 'utf8');
  assert.ok(workflow.includes("const isSharedShellAsset = value =>"), 'shared shell exception must be explicit');
  assert.ok(workflow.includes('20261017-static-shell-v1'), 'exception must pin the known static-shell key');
  assert.ok(workflow.includes('!value.includes(`v=${VERSION}`)'), 'the current global asset key remains required by default');
  assert.ok(workflow.includes('!isSharedShellAsset(value)'), 'only the explicit shared-shell exception bypasses the global asset key');
  assert.ok(workflow.includes('FAST_TOOL_AUDIT_PASS tools='), 'the indexed-tool audit success contract remains intact');
});

test('app privacy notice is shorter and styled for its LCP budget without hiding consent choices', () => {
  const html = fs.readFileSync('app.html', 'utf8');
  const runtime = fs.readFileSync('assets/js/site-main.js', 'utf8');
  assert.ok(html.includes('id="nn-app-consent-lcp"'), 'app-specific consent styling should be available before deferred scripts run');
  assert.ok(html.includes('.nn-app-page .nn-consent p{margin:0 0 6px!important;font-size:12px!important;line-height:1.3!important}'));
  assert.ok(runtime.includes("document.body.classList.contains('nn-app-page')"), 'only the Android preview receives compact consent wording');
  assert.ok(runtime.includes('Reject optional</strong> denies analytics storage and detailed interactions.'), 'the shorter wording preserves the reject behavior');
  assert.ok(runtime.includes('Limited cookie-less signals may still be sent by Google Consent Mode.'), 'consent-mode qualification remains visible');
  for (const choice of ['data-consent-allow', 'data-consent-basic', 'data-consent-off']) {
    assert.ok(runtime.includes(choice), 'consent action remains available: ' + choice);
  }
});

test('static shell sync excludes OTA and protected runtime trees rather than rewriting them', () => {
  const sync = fs.readFileSync('.github/scripts/sync_static_site_shell.py', 'utf8');
  assert.ok(sync.includes('EXCLUDED_HTML_DIRS'), 'protected directory policy must be explicit');
  for (const folder of ['ota', 'downloads', 'cloudflare', 'functions', 'firebase', 'nexusnova-dev-ai']) {
    assert.ok(sync.includes("'" + folder + "'") || sync.includes('"' + folder + '"'), 'protected path must be excluded: ' + folder);
  }
  assert.ok(sync.includes('def is_shell_managed_html(path: Path) -> bool:'), 'all sync targets must pass through the exclude predicate');
  assert.ok(sync.includes('def all_html_files():\n    return sorted(p for p in ROOT.rglob("*.html") if is_shell_managed_html(p))'));
});

test('overhaul cache-buster preserves the app consent runtime version', () => {
  const overhaul = fs.readFileSync('.github/scripts/total_site_overhaul.py', 'utf8');
  assert.ok(overhaul.includes("path.as_posix() == 'app.html'"), 'the app-only cache exception must be scoped to app.html');
  assert.ok(overhaul.includes("m.group(\"url\").endswith('assets/js/site-main.js')"), 'only the direct consent runtime receives the exception');
  assert.ok(overhaul.includes('20261018-app-consent-lcp-v1'), 'the current app consent runtime cache key is preserved');
  assert.ok(overhaul.includes("return f'{m.group(\"prefix\")}{m.group(\"url\")}?v={VERSION}{m.group(\"quote\")}'"), 'all other assets keep the normal global version');
});

test('generated static shell HTML contract threshold excludes the protected OTA page', () => {
  const sync = fs.readFileSync('.github/scripts/sync_static_site_shell.py', 'utf8');
  assert.ok(sync.includes("files.length >= 325, 'expected public static HTML sweep; found ' + files.length + ' HTML files'"));
  assert.ok(!sync.includes("files.length >= 326, 'expected full repository sweep"));
});

test('generated standalone shell validator uses its own protected-folder filter', () => {
  const sync = fs.readFileSync('.github/scripts/sync_static_site_shell.py', 'utf8');
  const start = sync.indexOf("VALIDATE_GLOBAL_LAYOUT = r'''");
  const end = sync.indexOf("TEST_FILE = r'''", start);
  assert.ok(start >= 0 && end > start, 'standalone validator template must be present');
  const template = sync.slice(start, end);
  assert.ok(template.includes('if not any(part in {" .git"') === false, 'avoid malformed protected-set spelling');
  assert.ok(template.includes("'ota'") || template.includes('"ota"'), 'validator should exclude OTA payloads');
  assert.ok(template.includes('for part in p.parts'), 'validator must use its own path check');
  assert.ok(!template.includes('if is_shell_managed_html(p)'), 'standalone generated validator must not depend on synchronizer-only helpers');
  const actual = fs.readFileSync('.github/scripts/validate_global_layout.py', 'utf8');
  assert.ok(actual.includes('for part in p.parts'));
  assert.ok(!actual.includes('is_shell_managed_html(p)'));
});

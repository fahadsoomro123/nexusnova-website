const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');

test('account header and primary navigation are present in source HTML', () => {
  const html = read('account.html');
  assert.match(html, /<header\b[^>]*class="nn-header"/i);
  assert.match(html, /<nav\b[^>]*class="nn-nav"/i);
  assert.match(html, /href="\/articles\.html"/i);
  assert.doesNotMatch(html, /auth-header-state\.js|data-nexusnova-auth-header/);
});

test('runtime account menu builder has been removed while account functionality remains', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'assets/js/auth-header-state.js')), false);
  for (const relative of ['assets/js/assistant.js', 'assets/js/site-main.js', 'assets/js/main.js']) {
    const source = read(relative);
    assert.doesNotMatch(source, /auth-header-state\.js|data-nexusnova-auth-header|data-nn-account-menu/,
      relative + ' must not generate or load a runtime header');
  }
  assert.ok(fs.existsSync(path.join(ROOT, 'assets/js/account-dashboard.js')));
  assert.doesNotMatch(read('assets/js/assistant.js'), /nav\\.appendChild\\(a\\)|trending\\.after\\(a\\)/,
    'assistant must not inject links into the static primary navigation');
});

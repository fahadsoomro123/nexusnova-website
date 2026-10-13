const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('homepage preconnects to its early third-party script origins', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /rel="preconnect" href="https:\/\/pagead\.googlesyndication\.com" crossorigin/);
  assert.match(html, /rel="preconnect" href="https:\/\/www\.googletagmanager\.com" crossorigin/);
});

test('below-the-fold HumanProof and footer CSS load asynchronously with no-script fallback', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  for (const file of ['humanproof-hero-360.css', 'footer-social.css']) {
    assert.ok(html.includes('href="assets/css/' + file + '" media="print" onload="this.media=\'all\'"'), file + ' should be non-render-blocking');
    assert.ok(html.includes('<noscript><link rel="stylesheet" href="assets/css/' + file + '"></noscript>'), file + ' must keep the no-script fallback');
  }
});

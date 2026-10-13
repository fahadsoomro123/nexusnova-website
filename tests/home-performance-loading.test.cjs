const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('homepage preconnects to its early third-party script origins', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.ok(html.includes('rel="preconnect" href="https://pagead2.googlesyndication.com" crossorigin'));
  assert.ok(html.includes('rel="preconnect" href="https://www.googletagmanager.com" crossorigin'));
});

test('below-the-fold HumanProof and footer CSS load asynchronously with no-script fallback', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  for (const file of ['humanproof-hero-360.css', 'footer-social.css']) {
    assert.ok(html.includes('href="assets/css/' + file + '" media="print" onload="this.media=\'all\'"'), file + ' should be non-render-blocking');
    assert.ok(html.includes('<noscript><link rel="stylesheet" href="assets/css/' + file + '"></noscript>'), file + ' must keep the no-script fallback');
    const head = html.slice(0, html.indexOf('</head>'));
    const activeHead = head.replace('<noscript><link rel="stylesheet" href="assets/css/' + file + '"></noscript>', '');
    assert.ok(!activeHead.includes('<link rel="stylesheet" href="assets/css/' + file + '">'), file + ' must not have a render-blocking head link outside noscript');
  }
});


test('live performance gate hashes the exact deployed homepage before measuring', () => {
  const workflow = fs.readFileSync('.github/workflows/live-performance-100.yml', 'utf8');
  assert.ok(workflow.includes('expected_html_sha="$(sha256sum index.html | awk'), 'expected hash must come from current checkout');
  assert.ok(workflow.includes('actual_html_sha="$(sha256sum "$tmp_body" | awk'), 'live HTML must be hashed');
  assert.ok(workflow.includes('[ "$expected_html_sha" = "$actual_html_sha" ]'), 'Lighthouse must wait for an exact HTML match');
  assert.ok(workflow.includes('Cache-Control: no-cache, no-store, max-age=0'), 'probe must bypass cached homepage');
  assert.ok(workflow.includes('Refusing to record a live Lighthouse result against stale content') || workflow.includes('refusing to record a live Lighthouse result against stale content'), 'stale deployments must fail closed');
});

test('homepage HumanProof attribution meets WCAG AA normal-text contrast', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const match = html.match(/\.nn-proof-attribution\{[^}]*color:\s*(#[0-9a-f]{6})/i);
  assert.ok(match, 'HumanProof attribution colour must be explicit');
  const rgb = match[1].slice(1).match(/../g).map(value => parseInt(value, 16) / 255);
  const channel = value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  const luminance = 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
  const contrast = 1.05 / (luminance + 0.05);
  assert.ok(contrast >= 4.5, 'HumanProof attribution contrast must be at least 4.5:1 (got ' + contrast.toFixed(2) + ':1)');
});

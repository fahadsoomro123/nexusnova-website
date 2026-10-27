const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('homepage reserves the delayed campaign-offer layout before launch data arrives', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('assets/css/seo-audit-launch.css', 'utf8');
  const baseOffer = css.match(/\.nn-audit-launch-offer\{([^}]*)\}/);
  const pendingOffer = css.match(/\.nn-audit-launch-offer\[data-pending\]\{([^}]*)\}/);
  assert.ok(baseOffer, 'the visible campaign offer has a base rule');
  assert.ok(pendingOffer, 'the pending campaign offer has a placeholder rule');
  assert.match(baseOffer[1], /min-height:280px/, 'desktop content is reserved before the API responds');
  assert.match(pendingOffer[1], /min-height:280px/, 'pending and loaded desktop cards reserve the same minimum height');
  assert.match(css, /\.nn-audit-launch \.nn-audit-launch-offer\{padding:18px 16px;min-height:320px\}/);
  assert.match(css, /\.nn-audit-launch \.nn-audit-launch-offer\[data-pending\]\{min-height:320px\}/);
  assert.match(css, /@media\(max-width:350px\)[\s\S]*?min-height:390px/);
  assert.match(css, /@media\(min-width:351px\) and \(max-width:359px\)[\s\S]*?min-height:370px/);
  assert.match(html, /id="nnAuditLaunchOffer" class="nn-audit-launch-offer" data-pending aria-hidden="true"/,
    'the voucher offer keeps its hidden/loading state; only its space is reserved');
});

test('homepage inline container widths match late global shell breakpoints to prevent width-induced CLS', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const shared = fs.readFileSync('assets/css/footer-social.css', 'utf8');
  assert.match(shared, /\.container,\s*\.nn-shell,\s*\.nn-inner-page \.container\{\s*width:min\(var\(--nn-global-content-max\),calc\(100% - \(var\(--nn-global-gutter\) \* 2\)\)\)!important;/);
  assert.match(html, /\.nn-shell\{width:min\(var\(--nn-max\),calc\(100% - 64px\)\);margin-inline:auto\}/);
  assert.match(html, /@media\(max-width:760px\)\s*\{\s*\.nn-shell\{width:min\(var\(--nn-max\),calc\(100% - 22px\)\);\}\s*\}/);
  assert.match(html, /@media\(min-width:1600px\)\s*\{\s*\.nn-shell\{width:min\(var\(--nn-max\),calc\(100% - 80px\)\);\}\s*\}/);
  assert.match(html, /\.nn-header \.nn-shell,\.nn-global-footer \.nn-shell\{width:min\(var\(--nn-max\),calc\(100% - 32px\)\);\}/);
  assert.match(html, /@media\(max-width:560px\)\s*\{\s*\.nn-header \.nn-shell,\.nn-global-footer \.nn-shell\{width:min\(var\(--nn-max\),calc\(100% - 22px\)\);\}\s*\}/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('Fix Issues explains why checkout is disabled when no tested direct repair is available', () => {
  const html = fs.readFileSync('seo-audit-studio.html', 'utf8');
  assert.match(html, /Website repository is connected, but this audit has no tested safe automatic repair/);
  assert.match(html, /No eligible direct auto-fix for this report\. No charge was created\./);
  assert.match(html, /The repository is already connected; reconnecting will not create a supported fix\./);
  assert.match(html, /A \$5 charge is allowed only after a specific tested repair is shown, approved, applied and live-verified/);
  assert.match(html, /PageSpeed reported these separate opportunities/);
});

test('Executive summary distinguishes PageSpeed opportunities from failed SEO checks', () => {
  const html = fs.readFileSync('seo-audit-studio.html', 'utf8');
  assert.match(html, /pageSpeedOpportunityMap/);
  assert.match(html, /PageSpeed opportunit'\+\(pageSpeedOpportunityCount===1\?'y':'ies'\)/);
  assert.match(html, /SEO check findings are listed here; PageSpeed opportunities are counted separately under Performance/);
  assert.match(html, /audit finding/);
});

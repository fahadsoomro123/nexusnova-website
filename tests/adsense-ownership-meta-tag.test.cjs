const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('homepage publishes one AdSense ownership meta tag inside head', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const head = html.match(/<head\\b[^>]*>[\\s\\S]*?<\\/head>/i);
  assert.ok(head, 'homepage head exists');
  const tags = head[0].match(/<meta\\b[^>]*name=["']google-adsense-account["'][^>]*>/gi) || [];
  assert.equal(tags.length, 1, 'exactly one AdSense ownership meta tag is present');
  assert.match(tags[0], /content=["']ca-pub-5070673529890078["']/i, 'publisher ID matches the AdSense account');
});

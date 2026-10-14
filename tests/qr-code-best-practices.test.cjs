const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('QR code best-practices guide links official safety guidance', () => {
  const html = fs.readFileSync('articles/qr-code-best-practices.html', 'utf8');
  const sources = [
    'https://consumer.ftc.gov/consumer-alerts/2026/09/see-qr-code-parked-somewhere-dont-scan-ityet',
    'https://www.ic3.gov/PSA/2022/PSA220118',
  ];

  assert.ok(html.includes('<h2 id="qr-code-safety-sources-title">Security guidance and further reading</h2>'));
  assert.ok(html.includes('Check the previewed domain before opening it'));
  assert.ok(html.includes('not a trust signal by itself'));
  assert.ok(html.includes('Reviewed 14 October 2026'));

  for (const url of sources) {
    assert.ok(html.includes(url), 'missing official QR-code safety reference: ' + url);
    const start = html.indexOf('<a href="' + url + '"');
    assert.notEqual(start, -1, 'source URL should be linked from the article');
    const end = html.indexOf('>', start);
    const anchor = html.slice(start, end + 1);
    assert.ok(anchor.includes('target="_blank"'));
    assert.ok(anchor.includes('rel="noopener noreferrer"'));
  }

  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  assert.ok(jsonLd, 'structured data should be present');
  const graph = JSON.parse(jsonLd[1]);
  const article = graph['@graph'].find(item => item['@type'] === 'Article');
  assert.ok(article, 'Article JSON-LD should remain valid');
  assert.equal(article.dateModified, '2026-10-14');
});

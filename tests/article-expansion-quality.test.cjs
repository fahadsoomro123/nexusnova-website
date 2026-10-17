const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const articleDir = path.join(__dirname, '..', 'articles');
const articleFiles = fs.readdirSync(articleDir).filter(name => name.endsWith('.html'));
const selfCanonicalArticles = articleFiles.filter(name => {
  const html = fs.readFileSync(path.join(articleDir, name), 'utf8');
  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  return canonical && canonical[1].replace(/\/$/, '') === 'https://nexusnovatools.com/articles/' + name;
});

test('the canonical article library contains exactly 100 unique article pages', () => {
  assert.equal(selfCanonicalArticles.length, 100, 'Expected 100 self-canonical articles, found ' + selfCanonicalArticles.length);
});

test('the final cash-flow guide meets its publishing contract', () => {
  const name = 'cash-flow-forecast-small-business.html';
  const html = fs.readFileSync(path.join(articleDir, name), 'utf8');
  const canonical = 'https://nexusnovatools.com/articles/' + name;
  const words = (html.replace(/<[^>]+>/g, ' ').match(/[\w’'-]+/g) || []).length;
  assert.match(html, /<meta name="description" content="[^"]+"/);
  assert.ok(html.includes('<link rel="canonical" href="' + canonical + '">'));
  assert.match(html, /"@type":"Article"/);
  assert.match(html, /<strong>Formula:<\/strong>/);
  assert.match(html, /<table>/);
  assert.match(html, /global-shell-guard\.js/);
  assert.ok(words >= 500, 'Expected a substantive guide, found ' + words + ' words');
  for (const route of ['invoice-maker.html', 'freelance-rate-calculator.html', 'percentage-calculator.html']) {
    assert.ok(html.includes('href="../' + route + '"'), 'Missing related tool link: ' + route);
  }
});

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const generatedBlockMarker = /data-ad-content-depth-remediation-v[23]|intended to support a real task, so this section focuses on verification and correct use rather than filler/i;

function collectHtml(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...collectHtml(absolute));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) found.push(absolute);
  }
  return found;
}

function publicHtmlFiles() {
  const topLevel = fs.readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.html'))
    .map(entry => path.join(root, entry.name));
  const nested = ['articles', 'tech', 'guides']
    .flatMap(name => {
      const dir = path.join(root, name);
      return fs.existsSync(dir) ? collectHtml(dir) : [];
    });
  return [...topLevel, ...nested];
}

test('published pages do not contain automated depth markers or generated meta-filler intros', () => {
  const pages = publicHtmlFiles();
  assert.ok(pages.length >= 80, 'site HTML inventory was unexpectedly small');
  const offenders = pages
    .filter(file => generatedBlockMarker.test(fs.readFileSync(file, 'utf8')))
    .map(file => path.relative(root, file))
    .sort();
  assert.deepEqual(offenders, [], 'Remove generated meta-filler and preserve only topic-specific guidance');
});

test('photo restoration guide cites primary documentation for resampling and generative edits', () => {
  const file = path.join(root, 'articles', 'ai-photo-restoration-vs-enhancement.html');
  const html = fs.readFileSync(file, 'utf8');
  const sources = [
    'https://helpx.adobe.com/photoshop/desktop/crop-resize-transform/resize-adjust-resolution/resampling-options.html',
    'https://helpx.adobe.com/photoshop/desktop/repair-retouch/clean-restore-images/enhance-image-quality-with-generative-upscale.html',
    'https://helpx.adobe.com/photoshop/desktop/create-open-import-images/create-images/edit-images-with-generative-fill.html',
  ];

  assert.ok(html.includes('<h2 id="restoration-sources-title">Sources and further reading</h2>'));
  for (const url of sources) {
    assert.ok(html.includes(url), 'missing primary image-editing reference: ' + url);
    const start = html.indexOf('<a href="' + url + '"');
    assert.notEqual(start, -1, 'source URL should be linked from the article');
    const end = html.indexOf('>', start);
    const anchor = html.slice(start, end + 1);
    assert.ok(anchor.includes('target="_blank"'));
    assert.ok(anchor.includes('rel="noopener noreferrer"'));
  }

  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  assert.ok(jsonLd, 'Article structured data should be present');
  const article = JSON.parse(jsonLd[1]);
  assert.equal(article['@type'], 'Article');
  assert.equal(article.dateModified, '2026-10-14');
});


test('image format guide links to current browser-format reference', () => {
  const file = path.join(root, 'articles', 'jpg-png-webp-avif-guide.html');
  const html = fs.readFileSync(file, 'utf8');
  const url = 'https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types';

  assert.ok(html.includes('<h2 id="image-format-sources-title">Standards and browser reference</h2>'));
  assert.ok(html.includes(url), 'missing MDN image-format reference');
  const start = html.indexOf('<a href="' + url + '"');
  assert.notEqual(start, -1, 'MDN source URL should be linked from the article');
  const end = html.indexOf('>', start);
  const anchor = html.slice(start, end + 1);
  assert.ok(anchor.includes('target="_blank"'));
  assert.ok(anchor.includes('rel="noopener noreferrer"'));

  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  assert.ok(jsonLd, 'Article structured data should be present');
  const article = JSON.parse(jsonLd[1]);
  assert.equal(article['@type'], 'Article');
  assert.equal(article.dateModified, '2026-10-14');
});


test('CS2 Valorant guide cites its conversion method and caveats', () => {
  const file = path.join(root, 'articles', 'cs2-valorant-sensitivity-edpi-guide.html');
  const html = fs.readFileSync(file, 'utf8');
  const sources = [
    'https://developer.valvesoftware.com/wiki/List_of_Counter-Strike_2_console_commands_and_variables',
    'https://mousetester.io/sensitivity/cs2/',
    'https://mousetester.io/sensitivity/valorant/',
  ];

  assert.ok(html.includes('<h2>Method and references</h2>'));
  assert.ok(html.includes('0.022 ÷ 0.07'));
  assert.ok(html.includes('does not make the field of view, scoped multipliers'));
  assert.ok(html.includes('not a statement that Riot officially endorses this conversion'));
  for (const url of sources) {
    assert.ok(html.includes(url), 'missing sensitivity-method reference: ' + url);
    const start = html.indexOf('<a href="' + url + '"');
    assert.notEqual(start, -1, 'source URL should be linked from the article');
    const end = html.indexOf('>', start);
    const anchor = html.slice(start, end + 1);
    assert.ok(anchor.includes('target="_blank"'));
    assert.ok(anchor.includes('rel="noopener noreferrer"'));
  }

  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  assert.ok(jsonLd, 'Article structured data should be present');
  const article = JSON.parse(jsonLd[1]);
  assert.equal(article['@type'], 'Article');
  assert.equal(article.dateModified, '2026-10-14');
});


test('password security guide links current NIST and CISA guidance', () => {
  const file = path.join(root, 'guides', 'password-security.html');
  const html = fs.readFileSync(file, 'utf8');
  const sources = [
    'https://pages.nist.gov/800-63-4/sp800-63b.html',
    'https://www.cisa.gov/secure-our-world/use-strong-passwords',
    'https://www.cisa.gov/secure-our-world/turn-multifactor-authentication',
  ];

  assert.ok(html.includes('<h2 id="password-security-sources-title">Official guidance and further reading</h2>'));
  assert.ok(html.includes('Updated 14 October 2026'));
  for (const url of sources) {
    assert.ok(html.includes(url), 'missing password security reference: ' + url);
    const start = html.indexOf('<a href="' + url + '"');
    assert.notEqual(start, -1, 'source URL should be linked from the guide');
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

test('EMI calculator avoids repeated template explanations and keeps decision-useful specifics', () => {
  const file = path.join(root, 'emi-calculator.html');
  const html = fs.readFileSync(file, 'utf8');

  assert.ok(html.includes('Worked EMI example'));
  assert.ok(html.includes('16,607.15'));
  assert.ok(html.includes('What formula the tool uses'));
  assert.ok(html.includes('What the estimate does not include'));
  assert.ok(html.includes('Compare offers on total borrowing cost'));
  assert.ok(html.includes('https://www.consumerfinance.gov/ask-cfpb/what-is-amortization-and-how-could-it-affect-my-auto-loan-en-771/'));
  assert.ok(html.includes('https://www.consumerfinance.gov/ask-cfpb/what-is-the-difference-between-a-loan-interest-rate-and-the-apr-en-733/'));
  assert.doesNotMatch(html, /Guide on Structured EMI and Debt Calculation|Key Features &amp; Practical Applications — EMI Calculator|Frequently Asked Questions — EMI Calculator|How the estimate works/);
});

test('BMI calculator uses concise sourced interpretation guidance instead of duplicate template copy', () => {
  const file = path.join(root, 'bmi-calculator.html');
  const html = fs.readFileSync(file, 'utf8');

  assert.ok(html.includes('70 ÷ (1.75 × 1.75)'));
  assert.ok(html.includes('age- and sex-specific BMI-for-age percentiles'));
  assert.ok(html.includes('https://www.cdc.gov/bmi/about/'));
  assert.ok(html.includes('https://www.cdc.gov/bmi/adult-calculator/calculator.html'));
  assert.ok(html.includes('https://www.cdc.gov/bmi/child-teen-calculator/'));
  assert.ok(html.includes('data-tool="bmi-calculator"'));
  assert.doesNotMatch(html, /Guide on How to Use the BMI Calculator|Key Features &amp; Practical Applications — BMI Calculator|Frequently Asked Questions — BMI Calculator/);
});


'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const articleDir = path.join(__dirname, '..', 'articles');
const articleFiles = fs.readdirSync(articleDir).filter(name => name.endsWith('.html'));
const repeatedTemplatePhrases = [
  'A useful estimate makes its assumptions visible.',
  'Keep the inputs on the same basis.',
  'Verify important inputs with the original provider or official source.',
  'No. It makes assumptions inspectable and scenarios comparable.',
  'for a related calculation or comparison.',
  'Use these NexusNova tools to test another input or compare a connected option:',
  'Write down current inputs and their dates.',
  'Verify the rate, fee, unit, eligibility and timing with a primary source.',
  'Test a conservative case and a plausible alternative while changing one variable at a time.',
  'Compare the estimate with an actual bill, statement, meter reading, quote or contract.',
  'Does this calculation guarantee the outcome?'
];

function visibleText(fragment) {
  return fragment
    .replace(/<!--.*?-->/gs, ' ')
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

test('article pages contain no known one-size-fits-all filler paragraphs, steps or FAQs', () => {
  const findings = [];
  for (const name of articleFiles) {
    const html = fs.readFileSync(path.join(articleDir, name), 'utf8');
    const main = (html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i) || [null, html])[1];
    for (const phrase of repeatedTemplatePhrases) {
      if (main.includes(phrase)) findings.push(name + ': ' + phrase);
    }
  }
  assert.deepEqual(findings, [], findings.join('\n'));
});

test('article library has no duplicate substantial editorial paragraphs across pages', () => {
  const seen = new Map();
  const duplicates = [];
  for (const name of articleFiles) {
    const html = fs.readFileSync(path.join(articleDir, name), 'utf8');
    const main = (html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i) || [null, html])[1];
    const article = (main.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i) || [null, main])[1];
    const paragraphs = [...article.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
      .map(match => visibleText(match[1]))
      .filter(text => text.split(/\s+/).length >= 35)
      .filter(text => !text.startsWith('Editorial note:'));
    for (const paragraph of paragraphs) {
      const normalized = paragraph.toLowerCase().replace(/\d+(?:[,.]\d+)?/g, '#').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
      const previous = seen.get(normalized);
      if (previous && previous !== name) duplicates.push(previous + ' <-> ' + name + ': ' + paragraph.slice(0, 160));
      else seen.set(normalized, name);
    }
  }
  assert.deepEqual(duplicates, [], duplicates.join('\n'));
});

test('indexable article metadata uses the article URL as its canonical', () => {
  const problems = [];
  for (const name of articleFiles) {
    const html = fs.readFileSync(path.join(articleDir, name), 'utf8');
    if (/\bnoindex\b/i.test((html.match(/<meta\b(?=[^>]*name=["']robots["'])[^>]*content=["']([^"']*)/i) || [null, ''])[1])) continue;
    const canonical = (html.match(/<link\b(?=[^>]*rel=["']canonical["'])[^>]*href=["']([^"']+)/i) || [null, ''])[1];
    const expected = 'https://nexusnovatools.com/articles/' + name;
    if (canonical !== expected) problems.push(name + ': expected ' + expected + ', found ' + canonical);
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

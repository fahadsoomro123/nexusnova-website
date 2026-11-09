'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const targets = [
  'png-to-jpg.html','jpg-to-png.html','jpg-to-pdf.html','calculator.html','stopwatch.html',
  'webp-to-jpg.html','text-to-pdf.html','webp-to-png.html','avif-to-jpg.html','heic-to-jpg.html',
  'word-counter.html','online-timer.html','bmi-calculator.html','emi-calculator.html','unit-converter.html',
  'age-calculator.html','pomodoro-timer.html','edpi-calculator.html','number-to-words.html','rgb-hex-converter.html',
  'text-diff-checker.html','ip-cidr-calculator.html','ai-vram-calculator.html','csv-json-converter.html',
  'discount-calculator.html','ai-token-calculator.html','text-case-converter.html','scientific-calculator.html',
  'paper-size-in-pixels.html','paper-size-converter.html','percentage-calculator.html','storage-size-converter.html',
  'time-duration-calculator.html','roman-numeral-converter.html','fps-frame-time-calculator.html',
  'unix-timestamp-converter.html','steam-playtime-calculator.html','bill-split-tip-calculator.html',
  'zakat-calculator-pakistan.html','date-difference-calculator.html','decision-matrix-calculator.html',
  'fbr-tax-calculator-pakistan.html','percentage-change-calculator.html','gaming-sensitivity-converter.html',
  'salary-tax-calculator-pakistan.html','minecraft-coordinate-converter.html',
  'social-security-cola-calculator-2027.html','electricity-bill-calculator-pakistan.html'
];
const legacy = ['NEXUSNOVA-TIER1-GUIDE:v1', 'nn-tier1-faq', 'A practical US workflow', 'contract, tax return, payroll choice'];
const genericPhrases = ['A freelancer using', 'When a US freelancer uses', 'For a remote team,', 'After completing the underlying work, students can use'];

function visibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

test('48 selected tool pages have a reviewed, tool-specific content block', () => {
  assert.equal(targets.length, 48);
  for (const name of targets) {
    const file = path.join(root, name);
    assert.ok(fs.existsSync(file), 'missing tool page: ' + name);
    const html = fs.readFileSync(file, 'utf8');
    const startMarker = '<!-- NEXUSNOVA_COMPACT_TOOL_GUIDE_START -->';
    const endMarker = '<!-- NEXUSNOVA_COMPACT_TOOL_GUIDE_END -->';
    const start = html.indexOf(startMarker);
    const end = html.indexOf(endMarker, start + startMarker.length);
    assert.ok(start >= 0 && end > start, name + ' must contain the reviewed guide block');
    const block = html.slice(start, end + endMarker.length);
    const words = (visibleText(block).match(/[\w’'-]+/g) || []).length;
    assert.ok(words >= 130, name + ' guide is too short: ' + words);
    for (const text of ['<h2', 'How to use', 'Practical example', 'Limits, privacy and checks']) {
      assert.ok(block.includes(text), name + ' missing ' + text);
    }
    for (const phrase of genericPhrases) {
      assert.ok(!block.toLowerCase().includes(phrase.toLowerCase()), name + ' contains generic filler: ' + phrase);
    }
  }
});

test('legacy generic guide/FAQ blocks have been removed from public top-level HTML pages', () => {
  const htmlFiles = fs.readdirSync(root).filter(name => name.toLowerCase().endsWith('.html'));
  for (const name of htmlFiles) {
    const html = fs.readFileSync(path.join(root, name), 'utf8');
    for (const marker of legacy) {
      assert.ok(!html.toLowerCase().includes(marker.toLowerCase()), name + ' still contains retired copy: ' + marker);
    }
  }
});

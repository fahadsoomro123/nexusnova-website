'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'seo-audit-studio.html'), 'utf8');

test('SEO Audit Studio keeps the initial report hidden and does not invent an example target or score', () => {
  const start = html.indexOf('<section id="auditReportSection"');
  const end = html.indexOf('<div class="source-diagnostics"', start);
  assert.ok(start >= 0 && end > start, 'audit report shell must exist');
  const section = html.slice(start, end);
  assert.ok(section.includes(' hidden>'), 'report remains hidden until a real audit response');
  assert.ok(section.includes('<h2 id="reportHeading">Audit results</h2>'));
  assert.ok(section.includes('<div class="report-url" id="reportUrl"></div>'));
  assert.ok(section.includes('id="overallGrade" class="grade-letter">N/A</div>'));
  assert.ok(section.includes('id="gradeHeading">Audit not run</h3>'));
  assert.ok(section.includes('style="--score:0"'));
  assert.ok(!section.includes('Audit Results for example.com'));
  assert.ok(!section.includes('https://example.com'));
  assert.ok(!section.includes('style="--score:72"'));
  assert.ok(!section.includes('8 recommendations'));
});

test('SEO Audit Studio explanatory copy stays short and focused on tool actions', () => {
  for (const phrase of [
    '<h2>Recommended next actions</h2>',
    'Enter a code or claim an available voucher.',
    'One claim per browser session. Eligibility is checked by the backend.',
    'A valid voucher or verified payment unlocks this report.'
  ]) assert.ok(html.includes(phrase), 'missing concise essential copy: ' + phrase);

  for (const phrase of [
    'PREMIUM AUDIT INTELLIGENCE',
    'YOUR NEXT MOVES',
    'The highest-priority fixes first, with duplicate mobile/desktop opportunities combined.',
    'New here? Claim your free full-audit voucher.',
    'Enter the voucher from the homepage or claim one here.'
  ]) assert.ok(!html.includes(phrase), 'unnecessary copy remains: ' + phrase);
});

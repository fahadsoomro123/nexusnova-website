'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const hubs = [
  'index.html',
  'tools.html',
  'calculator-tools.html',
  'developer-tools.html',
  'image-tools.html',
  'live.html',
  'network-tools.html',
  'pdf-tools.html',
  'productivity-tools.html',
];

// These phrases were actual published card copy. They describe an abstract
// "workflow" rather than the linked tool's purpose, input, output, or limits.
const templateCopy = [
  /focused browser image workflow/i,
  /focused browser OCR workflow/i,
  /focused browser workflow and clear outputs/i,
  /focused browser document workflow/i,
  /clear inputs and browser-side results/i,
  /simple browser workflow/i,
  /focused browser productivity task/i,
  /focused gaming utility workflow/i,
  /focused live-information browser page/i,
  /focused browser utility/i,
  /focused browser-based file or content workflow/i,
  /focused Pakistan-specific browser task/i,
  /focused result view/i,
];

function visibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

test('tool directories use specific summaries instead of generic workflow filler', () => {
  const missing = [];
  const offenders = [];

  for (const relative of hubs) {
    const file = path.join(root, relative);
    assert.ok(fs.existsSync(file), `Missing expected tool hub: ${relative}`);
    const html = fs.readFileSync(file, 'utf8');
    const anchorRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
    let match;
    let cards = 0;

    while ((match = anchorRe.exec(html))) {
      const attrs = match[1];
      const classMatch = attrs.match(/\bclass=["']([^"']*)["']/i);
      const classes = classMatch ? classMatch[1].split(/\s+/) : [];
      if (!classes.some(name => ['nn-master-tool', 'nn-tool-card', 'article-card'].includes(name))) {
        continue;
      }

      const paragraph = match[2].match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
      if (!paragraph) continue;
      cards += 1;
      const text = visibleText(paragraph[1]);
      const hrefMatch = attrs.match(/\bhref=["']([^"']+)["']/i);
      const label = `${relative}: ${hrefMatch ? hrefMatch[1] : '(unknown card)'}`;

      if (!text) missing.push(label);
      if (templateCopy.some(pattern => pattern.test(text))) {
        offenders.push(`${label} — ${text}`);
      }
    }

    assert.ok(cards > 0, `No tool summary cards were found in ${relative}`);
  }

  assert.deepEqual(missing, [], 'Every card summary paragraph should contain visible text');
  assert.deepEqual(
    offenders,
    [],
    'Replace generic workflow filler with a description that explains the linked tool',
  );
});

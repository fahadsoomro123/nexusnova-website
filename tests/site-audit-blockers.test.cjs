'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('article hub contains all 100 cards inside the searchable grid', () => {
  const html = read('articles.html');
  const gridOpen = html.indexOf('<div class="nn-article-grid" id="articles-grid">');
  const firstCard = html.indexOf('<a class="nn-article-card"', gridOpen);
  const noResults = html.indexOf('<div class="nn-no-results" id="article-no-results">', firstCard);
  const gridClose = html.lastIndexOf('</div>', noResults);
  assert.ok(gridOpen >= 0 && firstCard > gridOpen, 'grid and first card must exist');
  assert.ok(gridClose > firstCard && gridClose < noResults, 'grid must close after its last card and before no-results UI');
  assert.equal((html.slice(gridOpen, noResults).match(/class="nn-article-card"/g) || []).length, 100);
  assert.equal((html.slice(gridOpen, noResults).match(/class="nn-article-card"[^>]*data-article-card/g) || []).length, 100);
  assert.ok(html.slice(gridOpen, firstCard).indexOf('</div>') < 0, 'grid must not close before the first card');
});

test('credit-utilization decision table is valid and retains its intended calculations', () => {
  const html = read('articles/credit-utilization-explained.html');
  const start = html.indexOf('<h2>Practical decision table</h2>');
  const end = html.indexOf('<h2>Common mistakes</h2>', start);
  const block = html.slice(start, end);
  assert.equal((block.match(/<table\b/g) || []).length, 1, 'decision table must not contain nested tables');
  assert.equal((block.match(/<\/table>/g) || []).length, 1);
  for (const value of ['$300 balance on a $2,000 limit', '15% on that card', '$900 balance on a $2,000 limit', '45% on that card', '10% aggregate utilisation']) {
    assert.ok(block.includes(value), 'missing decision-table value: ' + value);
  }
});

test('education-savings decision table is valid and preserves the 2%, 4% and 6% scenarios', () => {
  const html = read('articles/education-savings-time-value.html');
  const start = html.indexOf('<h2>Practical decision table</h2>');
  const end = html.indexOf('<h2>How to apply the result</h2>', start);
  const block = html.slice(start, end);
  assert.equal((block.match(/<table\b/g) || []).length, 1, 'decision table must not contain nested tables');
  assert.equal((block.match(/<\/table>/g) || []).length, 1);
  for (const value of ['2% annual growth', 'About $23,435', '4% annual growth', 'About $27,369', '6% annual growth', 'About $31,876']) {
    assert.ok(block.includes(value), 'missing decision-table value: ' + value);
  }
});

test('small viewport shared navigation is width-constrained and long tables/code can wrap', () => {
  const shell = read('assets/css/static-site-shell.css');
  const inner = read('assets/css/nn-inner-shell.css');
  const tools = read('assets/css/tool-shell-2026.css');
  assert.match(shell, /\.nn-header \.nn-nav\{[^}]*width:100%!?important/i);
  assert.match(shell, /\.nn-header \.nn-nav\{[^}]*max-width:100%!?important/i);
  assert.match(inner, /\.nn-inner-page \.article-main table\{[^}]*table-layout:fixed/i);
  assert.match(inner, /\.nn-inner-page \.article-main th,.nn-inner-page \.article-main td\{[^}]*overflow-wrap:anywhere/i);
  assert.match(tools, /\.nn-inner-page \.table-wrap\{[^}]*overflow-x:auto/i);
  assert.match(tools, /\.nn12-zakat-result>div\{[^}]*flex-wrap:wrap/i);
});

test('AdSense review treats a standalone unfinished-status label as a blocker but not accounting terminology', () => {
  const python = [
    'import importlib.util',
    'import sys',
    'spec = importlib.util.spec_from_file_location("adsense_reviewer_audit", sys.argv[1])',
    'module = importlib.util.module_from_spec(spec)',
    'spec.loader.exec_module(module)',
    'technical = module.parse_page("<html><body><p>Explain exclusions, such as work in progress or consigned stock.</p></body></html>")',
    'assert "work in progress" not in module.unfinished_surface_markers(technical), "valid accounting phrase was flagged"',
    'placeholder = module.parse_page("<html><body><h1>Status: Work in progress</h1></body></html>")',
    'assert "work in progress" in module.unfinished_surface_markers(placeholder), "standalone placeholder was not flagged"'
  ].join('\n');
  const result = spawnSync(process.env.PYTHON || 'python3', ['-c', python, path.join(root, 'adsense_reviewer_audit.py')], {
    cwd: root,
    encoding: 'utf8',
    timeout: 15000
  });
  assert.equal(result.error, undefined, 'Python test process did not start: ' + (result.error?.message || ''));
  assert.equal(result.status, 0, 'AdSense marker regression failed:\n' + result.stdout + '\n' + result.stderr);
});

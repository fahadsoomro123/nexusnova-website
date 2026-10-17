'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { loadDataset } = require('../.github/scripts/generate_static_related_tools.cjs');

const ROOT = path.resolve(__dirname, '..');
const htmlFiles = () => {
  const files = [];
  const ignored = new Set(['.git', 'node_modules', 'quality-artifacts']);
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && ignored.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) files.push(full);
    }
  };
  walk(ROOT);
  return files.sort();
};

test('the canonical search index remains complete for build-time recommendations', () => {
  const data = loadDataset();
  const counts = Object.fromEntries(['tool', 'category', 'article', 'guide'].map(kind =>
    [kind, data.filter(item => item.type === kind).length]
  ));
  assert.deepEqual(counts, { tool: 108, category: 9, article: 100, guide: 14 });
  assert.equal(data.length, 231);
  assert.equal(new Set(data.map(item => item.url)).size, 230, 'one route is intentionally shared across index record types');
});

test('every indexed page and directory hub contains pre-rendered related content', () => {
  const data = loadDataset();
  const paths = new Set(data.map(item => item.url.replace(/^\/+/, '')));
  for (const hub of ['articles.html', 'guides.html', 'categories.html']) paths.add(hub);
  for (const route of paths) {
    const full = path.join(ROOT, route);
    assert.ok(fs.existsSync(full), 'indexed route missing: ' + route);
    const source = fs.readFileSync(full, 'utf8');
    if (!/<main\b/i.test(source)) continue; // Standalone widget/preview documents stay compact by design.
    assert.match(source, /data-nexusnova-related-tools/, route + ' must have source HTML recommendation cards');
  }
  const files = htmlFiles();
  const staticSections = files.filter(file =>
    /data-nexusnova-related-tools/.test(fs.readFileSync(file, 'utf8'))
  );
  assert.ok(staticSections.length >= 230, 'expected source-authored related sections, found ' + staticSections.length);
});

test('tool, article, guide and category recommendations are source-rendered with correct content semantics', () => {
  const section = relative => {
    const html = fs.readFileSync(path.join(ROOT, relative), 'utf8');
    const match = html.match(/<section class="nn-related-tools"[^>]*>[\s\S]*?<\/section>/i);
    assert.ok(match, relative + ' must contain a source HTML recommendation section');
    return match[0];
  };
  const toolSection = section('tools/solar-bill-calculator.html');
  assert.match(toolSection, /You May Also Like/);
  const toolLinks = [...toolSection.matchAll(/<a class="nn-related-tools__card" href="([^"]+)"/g)].map(match => match[1]);
  assert.equal(toolLinks.length, 4);
  assert.ok(!toolLinks.includes('/tools/solar-bill-calculator.html'), 'a tool must not recommend itself');

  for (const route of ['articles/2026-us-federal-tax-brackets-explained.html', 'guides/image-compression.html']) {
    const contentSection = section(route);
    assert.match(contentSection, /Recommended Tools &amp; Related Guides|Recommended Tools & Related Guides/);
    assert.match(contentSection, /data-nexusnova-related-content/);
    assert.match(contentSection, /href="\/(?:articles|guides)\//, route + ' must include internal reading recommendations');
  }

  const categorySection = section('categories.html');
  assert.match(categorySection, /Featured Utilities/);
  assert.match(categorySection, /data-nexusnova-featured-utilities/);
});

test('static footer privacy control and copyright are authored in HTML, not runtime injected', () => {
  const currentYear = new Date().getUTCFullYear();
  for (const file of htmlFiles()) {
    const source = fs.readFileSync(file, 'utf8');
    assert.equal((source.match(/<button\b[^>]*data-nexusnova-consent-reopen/g) || []).length, 1,
      path.relative(ROOT, file) + ' must contain one static privacy-choices control');
    assert.doesNotMatch(source, /data-year/, path.relative(ROOT, file) + ' must not use runtime year placeholders');
  }
  assert.match(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'),
    new RegExp('©\\s*' + currentYear + ' NexusNova Tools'));
  for (const file of ['assets/js/site-main.js', 'assets/js/analytics.js', 'assets/js/account-shell.js']) {
    assert.doesNotMatch(fs.readFileSync(path.join(ROOT, file), 'utf8'),
      /data-year|createElement\(['"]button['"]\)|insertAdjacentElement\(['"]afterend['"]/,
      file + ' must not reconstruct shell/footer controls');
  }
});

test('obsolete shell and related-content loader scripts are absent from the repository', () => {
  for (const relative of [
    'assets/js/nn-inner-shell.js',
    'assets/js/related-tools-bootstrap.js',
    'assets/js/global-shell-guard.js',
    'assets/js/related-tools.js'
  ]) {
    assert.equal(fs.existsSync(path.join(ROOT, relative)), false, relative + ' must remain deleted');
  }
  const forbiddenLoader = /<script\b[^>]*\bsrc=["'][^"']*(?:nn-inner-shell|related-tools-bootstrap|global-shell-guard)\.js/i;
  for (const file of htmlFiles()) {
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), forbiddenLoader, path.relative(ROOT, file));
  }
  for (const relative of ['assets/js/main.js', 'assets/js/analytics.js', 'assets/js/search-core.js', 'assets/js/tier1-tools.js']) {
    assert.doesNotMatch(fs.readFileSync(path.join(ROOT, relative), 'utf8'),
      /nn-inner-shell\.js|related-tools-bootstrap\.js|global-shell-guard\.js/,
      relative + ' must not dynamically request a retired loader');
  }
});

test('the build-time recommendation selector is free of browser DOM mutation', () => {
  const source = fs.readFileSync(path.join(ROOT, '.github/scripts/related_tools_selector.cjs'), 'utf8');
  assert.match(source, /function selectRelatedTools/);
  assert.match(source, /function selectRelatedReading/);
  assert.doesNotMatch(source, /\b(?:window|document)\s*(?:\.|\[)|createElement|appendChild|innerHTML|querySelector|MutationObserver/);
});

test('static recommendation generation is reproducible and already synchronized', () => {
  const script = path.join(ROOT, '.github/scripts/generate_static_related_tools.cjs');
  const result = spawnSync(process.execPath, [script, '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(result.status, 0, (result.stdout || '') + (result.stderr || ''));
  assert.match(result.stdout, /STATIC_RELATED_CONTENT_PASS/);
});

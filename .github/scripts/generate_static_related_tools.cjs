#!/usr/bin/env node
'use strict';

/* Build-time replacement for the browser-side related-content bootstrap. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '../..');
const ORIGIN = 'https://nexusnovatools.com';
const CSS_PATH = path.join(ROOT, 'assets/css/static-site-shell.css');
const CORE_PATH = path.join(ROOT, 'assets/js/search-core.js');
const related = require(path.join(ROOT, '.github/scripts/related_tools_selector.cjs'));

const LOADER_RE = /\s*<script\b(?=[^>]*\bsrc\s*=\s*["'][^"']*(?:nn-inner-shell|related-tools-bootstrap|related-tools)\.js(?:\?[^"']*)?["'])[^>]*>\s*<\/script\s*>/gi;
const RELATED_CSS = [
'/* Build-time related content: generated as plain HTML and CSS. */',
'.nn-related-tools{margin:28px 0 32px;padding:clamp(18px,2.5vw,26px);border:1px solid #e2e8f0;border-radius:18px;background:#fff;color:#0f172a;box-shadow:0 8px 24px rgba(15,23,42,.045)}',
'.nn-related-tools__heading{margin:0 0 6px;color:#0f172a;font-size:clamp(1.35rem,2.8vw,1.7rem);line-height:1.25}',
'.nn-related-tools__intro{margin:0 0 16px;color:#475569;line-height:1.65}',
'.nn-related-tools__grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}',
'.nn-related-tools__card{display:flex;min-width:0;flex-direction:column;gap:8px;padding:16px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;color:#0f172a;text-decoration:none;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}',
'.nn-related-tools__card:hover{transform:translateY(-2px);border-color:#cbd5e1;box-shadow:0 10px 22px rgba(15,23,42,.08)}',
'.nn-related-tools__card:focus-visible{outline:3px solid #93c5fd;outline-offset:3px}',
'.nn-related-tools__category{color:#64748b;font-size:.75rem;font-weight:700;letter-spacing:.02em}',
'.nn-related-tools__title{margin:0;color:#0f172a;font-size:1rem;line-height:1.4;overflow-wrap:anywhere}',
'.nn-related-tools__action{margin-top:auto;color:#334155;font-size:.85rem;font-weight:800}',
'@media(max-width:900px){.nn-related-tools__grid{grid-template-columns:repeat(2,minmax(0,1fr))}}',
'@media(max-width:560px){.nn-related-tools__grid{grid-template-columns:1fr}.nn-related-tools__card{min-height:0}}',
'@media(prefers-reduced-motion:reduce){.nn-related-tools__card{transition:none}.nn-related-tools__card:hover{transform:none}}',
'/* Static privacy control: behavior binds to the source-authored footer button. */',
'.nn-global-footer .nn-consent-reopen{display:inline-flex;align-items:center;justify-content:center;min-height:30px;padding:4px 8px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#334155;font:750 10px/1.3 var(--nn-sans);cursor:pointer}',
'.nn-global-footer .nn-consent-reopen:hover{border-color:#c4b5fd;background:#faf5ff;color:#5b21b6}',
'.nn-global-footer .nn-consent-reopen:focus-visible{outline:3px solid #93c5fd;outline-offset:2px}'
].join('\n');

function loadDataset() {
  const sandbox = { window: { document: null, location: { pathname: '/' } }, URL, Set };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(CORE_PATH, 'utf8'), sandbox, { filename: CORE_PATH });
  const data = sandbox.window.NexusNovaSearchData;
  if (!Array.isArray(data)) throw new Error('search-core.js did not expose its canonical dataset');
  const counts = {};
  ['tool','category','article','guide'].forEach(k => { counts[k] = data.filter(x => x.type === k).length; });
  const expected = { tool: 108, category: 9, article: 100, guide: 14 };
  Object.keys(expected).forEach(key => {
    if (counts[key] !== expected[key]) throw new Error('search index ' + key + ' count ' + counts[key] + ' != ' + expected[key]);
  });
  if (data.length !== 231) throw new Error('search index has ' + data.length + ' records, expected 231');
  return data;
}

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);
}

function pageContext(data, pagePath) {
  const listings = { '/articles.html': 'article-list', '/guides.html': 'guide-list', '/categories.html': 'category-list' };
  if (listings[pagePath]) return { kind: listings[pagePath], entry: null, path: pagePath };
  const priority = ['category','article','guide','tool'];
  for (const type of priority) {
    const entry = data.find(item => item.type === type && related.getCanonicalPath(item, ORIGIN) === pagePath);
    if (entry) return { kind: type, entry: entry, path: related.getCanonicalPath(entry, ORIGIN) };
  }
  return null;
}

function renderCard(entry, type, action) {
  const href = entry.href || related.getCanonicalPath(entry, ORIGIN);
  if (!href) return '';
  const category = type === 'tool' ? (entry.category || 'Free utility') : type === 'guide' ? 'Related guide' : 'Related article';
  return '<a class="nn-related-tools__card" href="' + escapeHtml(href) + '"><span class="nn-related-tools__category">' +
    escapeHtml(category) + '</span><h3 class="nn-related-tools__title">' + escapeHtml(entry.title) +
    '</h3><span class="nn-related-tools__action">' + action + '</span></a>';
}

function renderSection(data, context, pagePath) {
  const isContent = ['article','guide','article-list','guide-list'].includes(context.kind);
  const currentPath = context.path || pagePath;
  const currentEntry = context.entry || {
    title: context.kind === 'article-list' ? 'Articles' : context.kind === 'guide-list' ? 'Guides' : 'Categories',
    category: context.kind === 'article-list' ? 'Articles' : context.kind === 'guide-list' ? 'Guides' : '',
    tags: []
  };
  const tools = related.selectRelatedTools(data, currentPath, { origin: ORIGIN, limit: 4, currentEntry: currentEntry });
  if (tools.length < 3) return '';
  const preferredType = context.kind === 'article-list' ? 'guide' : context.kind === 'guide-list' ? 'article' : undefined;
  const reading = isContent ? related.selectRelatedReading(data, currentEntry, currentPath, tools, { limit: 2, preferredType: preferredType }) : [];
  const heading = isContent ? 'Recommended Tools & Related Guides' : context.kind === 'tool' ? 'You May Also Like' : 'Featured Utilities';
  const intro = isContent
    ? 'Explore useful utilities and related reading selected from the NexusNova content index.'
    : context.kind === 'tool'
      ? 'Explore a few related free tools for your next task.'
      : 'Explore useful free utilities from this part of NexusNova Tools.';
  const cards = tools.map(entry => renderCard(entry, 'tool', 'Open tool →')).join('') +
    reading.map(entry => renderCard(entry, entry.type, entry.type === 'guide' ? 'Read guide →' : 'Read article →')).join('');
  const contentAttr = isContent ? ' data-nexusnova-related-content=""' : '';
  const featuredAttr = ['category','category-list'].includes(context.kind) ? ' data-nexusnova-featured-utilities=""' : '';
  const aria = isContent ? 'Recommended tools and related reading' : 'Featured utilities';
  return '<section class="nn-related-tools" data-nexusnova-related-tools=""' + contentAttr + featuredAttr +
    ' aria-labelledby="nn-related-tools-heading"><h2 id="nn-related-tools-heading" class="nn-related-tools__heading">' +
    heading + '</h2><p class="nn-related-tools__intro">' + intro + '</p><div class="nn-related-tools__grid" aria-label="' +
    aria + '">' + cards + '</div></section>';
}

function listHtmlFiles() {
  const output = [];
  const ignored = new Set(['.git','node_modules','quality-artifacts']);
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && ignored.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) output.push(full);
    }
  }
  walk(ROOT);
  return output.sort();
}

function generate(options) {
  const check = !!(options && options.check);
  const data = loadDataset();
  const files = listHtmlFiles();
  let changedFiles = 0, removedLoaders = 0, generatedSections = 0;
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
    let updated = source.replace(LOADER_RE, () => { removedLoaders += 1; return ''; });
    updated = updated.replace(/<span\b[^>]*\bdata-year\b[^>]*>\s*<\/span\s*>/gi, String(new Date().getUTCFullYear()));
    updated = updated.replace(/^\s*var yearNodes\s*=\s*document\.querySelectorAll\(['"]\[data-year\]['"]\);\s*$/gm, '');
    updated = updated.replace(/^\s*yearNodes\.forEach\(function\s*\(node\)\s*\{\s*node\.textContent\s*=\s*String\(new Date\(\)\.getFullYear\(\)\);\s*\}\);\s*$/gm, '');
    updated = updated.replace(/\s*(?:const|let|var)\s+\w+\s*=\s*document\.querySelector\(['"]\[data-year\]['"]\);\s*if\s*\(\w+\)\s*\w+\.textContent\s*=\s*(?:String\()?new Date\(\)\.getFullYear\(\)\)?;?/g, '');
    updated = updated.replace(/\s*document\.querySelectorAll\(['"]\[data-year\]['"]\)\.forEach\(\w+\s*=>\s*\{?\s*\w+\.textContent\s*=\s*String\(new Date\(\)\.getFullYear\(\)\);?\s*\}?\);?/g, '');
    const relPath = '/' + path.relative(ROOT, file).split(path.sep).join('/');
    if (relPath === '/articles.html') {
      const gridOpen = updated.indexOf('<div class="nn-article-grid" id="articles-grid">');
      const firstCard = gridOpen < 0 ? -1 : updated.indexOf('<a class="nn-article-card"', gridOpen);
      const earlyClose = gridOpen < 0 ? -1 : updated.indexOf('</div>', gridOpen);
      if (gridOpen >= 0 && firstCard >= 0 && earlyClose >= 0 && earlyClose < firstCard) {
        updated = updated.slice(0, earlyClose) + updated.slice(earlyClose + '</div>'.length);
        updated = updated.replace(/(<div class="nn-article-grid" id="articles-grid">)\s*(?=<a class="nn-article-card")/, '$1\n          ');
      }
      const noResults = updated.indexOf('<div class="nn-no-results" id="article-no-results">');
      if (gridOpen >= 0 && noResults >= 0) {
        const lastCard = updated.lastIndexOf('<a class="nn-article-card"', noResults);
        const gridClose = lastCard < 0 ? -1 : updated.indexOf('</div>', lastCard);
        if (lastCard >= 0 && (gridClose < 0 || gridClose > noResults)) {
          updated = updated.slice(0, noResults) + '</div>\n      ' + updated.slice(noResults);
        }
      }
    }
    const context = pageContext(data, relPath);
    if (context && /<main\b/i.test(updated) && !/data-nexusnova-related-(?:tools|content)/i.test(updated)) {
      const section = renderSection(data, context, relPath);
      if (section) {
        const result = updated.replace(/<\/main\s*>/i, section + '\n</main>');
        if (result !== updated) { updated = result; generatedSections += 1; }
      }
    }
    if (updated !== source) {
      changedFiles += 1;
      if (check) console.log('WOULD_UPDATE ' + path.relative(ROOT, file).split(path.sep).join('/'));
      else fs.writeFileSync(file, updated, 'utf8');
    }
  }
  const css = fs.readFileSync(CSS_PATH, 'utf8');
  if (!css.includes('.nn-related-tools__grid') || !css.includes('.nn-global-footer .nn-consent-reopen')) {
    changedFiles += 1;
    if (check) console.log('WOULD_UPDATE assets/css/static-site-shell.css');
    else fs.writeFileSync(CSS_PATH, css.trimEnd() + '\n\n' + RELATED_CSS + '\n', 'utf8');
  }
  console.log('STATIC_RELATED_CONTENT html_files=' + files.length + ' changed_files=' + changedFiles +
    ' removed_runtime_loaders=' + removedLoaders + ' generated_sections=' + generatedSections);
  if (check && changedFiles) throw new Error('STATIC_RELATED_CONTENT_FAIL generated output is stale');
  console.log('STATIC_RELATED_CONTENT_PASS');
}

if (require.main === module) generate({ check: process.argv.includes('--check') });
module.exports = { generate: generate, loadDataset: loadDataset, renderSection: renderSection };

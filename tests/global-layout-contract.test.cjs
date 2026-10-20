const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const shellPart = (source, tag) => {
  const pattern = tag === 'header'
    ? /<header\b(?=[^>]*class=["'][^"']*\bnn-header\b[^"']*["'])[^>]*>[\s\S]*?<\/header\s*>/i
    : /<footer\b(?=[^>]*class=["'][^"']*\bnn-footer\b[^"']*\bnn-global-footer\b[^"']*["'])[^>]*>[\s\S]*?<\/footer\s*>/ig;
  const matches = [...source.matchAll(new RegExp(pattern.source, 'ig'))];
  if (!matches.length) return '';
  if (tag === 'footer') {
    const canonical = matches.find(match => match[0].includes('<source type="image/webp"') && match[0].includes('nn-footer-brand-logo'));
    return (canonical || matches[matches.length - 1])[0];
  }
  return matches[0][0];
};
const labels = header => {
  const nav = (header.match(/<nav\b[^>]*>[\s\S]*?<\/nav\s*>/i) || [''])[0];
  return [...nav.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a\s*>/gi)]
    .map(match => match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
};

test('every HTML page has the canonical static index header and footer', () => {
  const index = read('index.html');
  const header = shellPart(index, 'header');
  const footer = shellPart(index, 'footer');
  assert.ok(header, 'index.html header missing');
  assert.ok(footer, 'index.html footer missing');
  assert.deepEqual(labels(header), ['Home', 'All Tools', 'Content', 'Categories', 'Articles', 'Guides']);
  const files = [];
  const walk = dir => {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['.git', 'node_modules', 'quality-artifacts', 'ota', 'downloads', 'cloudflare', 'functions', 'firebase', 'nexusnova-dev-ai'].includes(item.name)) continue;
      const full = path.join(dir, item.name);
      if (item.isDirectory()) walk(full);
      else if (item.isFile() && item.name.toLowerCase().endsWith('.html')) files.push(full);
    }
  };
  walk(root);
  assert.ok(files.length >= 325, 'expected public static HTML sweep; found ' + files.length + ' HTML files');
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const relative = path.relative(root, file);
    assert.equal(shellPart(source, 'header'), header, relative + ' header differs');
    assert.equal(shellPart(source, 'footer'), footer, relative + ' footer differs');
    assert.equal((source.match(/<footer\b/gi) || []).length, 1, relative + ' must contain exactly one footer element');
    assert.equal((source.match(/\/assets\/css\/static-site-shell\.css\?/g) || []).length, 1,
      relative + ' must load shared shell stylesheet once');
    assert.doesNotMatch(source, /<script\b[^>]*\bsrc=["'][^"']*global-shell-guard\.js/i,
      relative + ' still loads retired dynamic guard');
  }
});

test('dynamic header and footer repair loaders are gone', () => {
  for (const file of ['assets/js/main.js', 'assets/js/site-main.js', 'assets/js/analytics.js', 'assets/js/related-tools.js']) {
    assert.doesNotMatch(read(file), /global-shell-guard\.js/, file + ' still loads retired guard');
  }
  assert.doesNotMatch(read('assets/js/main.js'), /enforceSelectedHeaderLogo|normalizeFooterStructure|global-shell-guard\.js/);
  assert.doesNotMatch(read('assets/js/nn-inner-shell.js'), /normalizeInnerHeader|ensureTrustFooter|ensureWebsiteLaunchesBadge|global-shell-guard\.js|querySelectorAll\(["']header/);
  assert.doesNotMatch(read('assets/js/global-shell-guard.js'), /MutationObserver|createElement|appendChild|removeChild|innerHTML|querySelector/);
  assert.match(read('assets/js/nn-inner-shell.js'), /related-tools-bootstrap\.js/);
});

test('109 indexed tool routes resolve to unique HTML files', () => {
  const core = read('assets/js/search-core.js');
  const routes = [...core.matchAll(/\{\s*title:"((?:[^"\\]|\\.)*)",\s*url:"((?:[^"\\]|\\.)*)",\s*type:"tool"/g)].map(match => match[2]);
  assert.equal(routes.length, 109);
  assert.equal(new Set(routes).size, 109);
  for (const route of routes) assert.ok(fs.existsSync(path.join(root, route.replace(/^\/+/, ''))), 'missing indexed tool route ' + route);
});

test('sitemap synchronization rebuilds the article URL set', () => {
  assert.match(read('.github/scripts/sync_phase2_content.py'), /Rebuild article URL entries/);
  assert.match(read('.github/scripts/validate_global_layout.py'), /expected/);
  assert.match(read('.github/scripts/validate_global_layout.py'), /actual/);
});

test('static shell stylesheet caps logos and provides mobile-safe navigation', () => {
  const css = read('assets/css/static-site-shell.css');
  assert.match(css, /max-height:\s*40px\s*!important/);
  assert.match(css, /@media\s*\(max-width:\s*560px\)/);
  assert.match(css, /overflow-x:\s*auto\s*!important/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

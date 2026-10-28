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
const normalizeShellMarkup = markup => markup.replace(/>\s+</g, '><').trim();
const labels = header => {
  const nav = (header.match(/<nav\b[^>]*>[\s\S]*?<\/nav\s*>/i) || [''])[0];
  return [...nav.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a\s*>/gi)]
    .map(match => match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
};

test('static shell synchronizer transforms every HTML page to the complete canonical footer', () => {
  const { spawnSync } = require('node:child_process');
  const python = [
    'import importlib.util, json, re, sys',
    'spec = importlib.util.spec_from_file_location("shell_sync", sys.argv[1])',
    'module = importlib.util.module_from_spec(spec)',
    'spec.loader.exec_module(module)',
    'header, footer = module.canonical_templates()',
    'paths = module.all_html_files()',
    'failures = []',
    'for path in paths:',
    '    source = path.read_text(encoding="utf-8-sig", errors="replace")',
    '    normalized = module.normalize_html(source, header, footer)',
    '    spans = module.ElementSpanParser(normalized).spans.get("footer", [])',
    '    if len(spans) != 1:',
    '        failures.append(f"{path.relative_to(module.ROOT).as_posix()}: expected one normalized footer, found {len(spans)}")',
    '        continue',
    '    expected = module.preserve_owner_console_entry(source, footer)',
    '    start, end, _ = spans[0]',
    '    actual = normalized[start:end]',
    '    compact = lambda value: re.sub(r">\\s+<", "><", value).strip()',
    '    if compact(actual) != compact(expected):',
    '        failures.append(f"{path.relative_to(module.ROOT).as_posix()}: normalized footer differs from the canonical footer")',
    'if failures:',
    '    print("\\n".join(failures[:30]), file=sys.stderr)',
    '    sys.exit(1)',
    'print(json.dumps([path.relative_to(module.ROOT).as_posix() for path in paths]))'
  ].join('\n');
  const result = spawnSync(process.env.PYTHON || 'python3', [
    '-c', python, path.join(root, '.github/scripts/sync_static_site_shell.py')
  ], { cwd: root, encoding: 'utf8', timeout: 60000 });
  assert.equal(result.error, undefined, 'shell normalization process did not start: ' + (result.error?.message || ''));
  assert.equal(result.status, 0, 'every static page must normalize to the canonical footer:\\n' + result.stdout + '\\n' + result.stderr);
  const pages = JSON.parse(result.stdout);
  assert.ok(pages.length >= 325, 'expected a full public HTML normalization sweep; found ' + pages.length + ' pages');
  assert.ok(pages.includes('seo-audit-studio.html'), 'the Audit Studio page is included in the normalization sweep');
});

test('every HTML page shares the canonical header and stable footer branding', () => {
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
    assert.equal(normalizeShellMarkup(shellPart(source, 'header')), normalizeShellMarkup(header), relative + ' header differs');
    const pageFooter = shellPart(source, 'footer');
    if (relative === 'seo-audit-studio.html') {
      assert.equal((pageFooter.match(/href="\/seo-audit-studio-admin\.html"/g) || []).length, 1,
        'SEO Audit Studio must expose exactly one Owner Console footer entry');
    }
    assert.equal((source.match(/<footer\b/gi) || []).length, 1, relative + ' must contain exactly one footer element');
    const shellCssTags = source.match(/<link\\b[^>]*\\/assets\\/css\\/static-site-shell\\.css\\?[^>]*>/gi) || [];
    const shellStylesheets = shellCssTags.filter(tag => /\\brel=["']stylesheet["']/i.test(tag));
    const shellPreloads = shellCssTags.filter(tag =>
      /\\brel=["']preload["']/i.test(tag) && /\\bas=["']style["']/i.test(tag)
    );
    assert.equal(shellStylesheets.length, 1,
      relative + ' must load the shared shell stylesheet once');
    assert.ok(shellPreloads.length <= 1,
      relative + ' must not duplicate the shared shell style preload');
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
  const validator = read('.github/scripts/validate_global_layout.py');
  const sync = read('.github/scripts/sync_static_site_shell.py');
  const uniqueRouteContract = 'if len(routes) != 109 or len({url for _, url in routes}) != 109:';
  assert.ok(validator.includes(uniqueRouteContract), 'standalone validator must require exactly 109 unique URLs');
  const templateStart = sync.indexOf('VALIDATE_GLOBAL_LAYOUT = r');
  const templateEnd = sync.indexOf('TEST_FILE = r', templateStart);
  assert.ok(templateStart >= 0 && templateEnd > templateStart, 'generated validator template must exist');
  assert.ok(sync.slice(templateStart, templateEnd).includes(uniqueRouteContract),
    'the synchronizer must generate the same 109-unique-URL contract');
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

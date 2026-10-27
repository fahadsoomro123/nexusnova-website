const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('homepage preconnects to its actual early API and analytics origins, not unused AdSense', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.ok(html.includes('rel="preconnect" href="https://nexusnova-audit-studio.fahadsoomro123.workers.dev" crossorigin'));
  assert.ok(html.includes('rel="preconnect" href="https://www.googletagmanager.com" crossorigin'));
  assert.ok(!html.includes('rel="preconnect" href="https://pagead2.googlesyndication.com" crossorigin'));
});

test('below-the-fold HumanProof and footer CSS load asynchronously with no-script fallback', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  for (const file of ['humanproof-hero-360.css', 'footer-social.css']) {
    assert.ok(html.includes('href="assets/css/' + file + '?v=20261015-v4" media="print" onload="this.media=\'all\'"'), file + ' should be non-render-blocking with the live cache key');
    assert.ok(html.includes('<noscript><link rel="stylesheet" href="assets/css/' + file + '?v=20261015-v4"></noscript>'), file + ' must keep the no-script fallback with the live cache key');
    const head = html.slice(0, html.indexOf('</head>'));
    const activeHead = head.replace(/<noscript>[\s\S]*?<\/noscript>/gi, '');
    const blockingTag = '<link rel="stylesheet" href="assets/css/' + file + '?v=20261015-v4">';
    assert.ok(!activeHead.includes(blockingTag), file + ' must not have a render-blocking head link outside noscript');
  }
});


test('live performance gate hashes the exact deployed runtime and changed static files before measuring', () => {
  const workflow = fs.readFileSync('.github/workflows/live-performance-100.yml', 'utf8');
  assert.ok(workflow.includes('fetch-depth: 2'), 'checkout must include the parent for changed-file detection');
  assert.ok(workflow.includes('Wait for exact homepage and changed assets to reach production'));
  assert.ok(workflow.includes("'index.html', 'assets/js/main.js'"), 'both homepage HTML and shared runtime must be checked');
  assert.ok(workflow.includes("'git', 'diff', '--name-only', 'HEAD^', 'HEAD'"), 'changed static files must be discovered from this commit');
  assert.ok(workflow.includes('hashlib.sha256(Path(path).read_bytes()).hexdigest()'), 'expected hashes must come from the checked-out source');
  assert.ok(workflow.includes('hashlib.sha256(body).hexdigest()'), 'production response bodies must be hashed');
  assert.ok(workflow.includes("'Cache-Control': 'no-cache, no-store, max-age=0'"), 'asset probes must bypass cached responses');
  assert.ok(workflow.includes('range(1, 41)'), 'the deployment wait must be bounded');
  assert.ok(workflow.includes('refusing to measure a stale deployment'), 'stale deployments must fail closed');
  assert.ok(
    workflow.indexOf('Wait for exact homepage and changed assets to reach production') <
    workflow.indexOf('Audit the actual production homepage'),
    'Lighthouse must not run until runtime and changed assets match source'
  );
});

test('homepage HumanProof attribution meets WCAG AA normal-text contrast', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const match = html.match(/\.nn-proof-attribution\{[^}]*color:\s*(#[0-9a-f]{6})/i);
  assert.ok(match, 'HumanProof attribution colour must be explicit');
  const rgb = match[1].slice(1).match(/../g).map(value => parseInt(value, 16) / 255);
  const channel = value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  const luminance = 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
  const contrast = 1.05 / (luminance + 0.05);
  assert.ok(contrast >= 4.5, 'HumanProof attribution contrast must be at least 4.5:1 (got ' + contrast.toFixed(2) + ':1)');
});

test('homepage header and footer use responsive WebP logo sources with PNG fallbacks', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const source = /<source type="image\/webp" srcset="\/?assets\/logo-2x\.webp(?:\?[^ ]*)? 2x, \/?assets\/logo-3x\.webp(?:\?[^ ]*)? 3x">/g;
  assert.equal((html.match(source) || []).length, 2, 'header and footer must use responsive WebP sources');
  for (const className of ['nn-brand-logo-img', 'nn-footer-brand-logo']) {
    const pattern = new RegExp('<picture><source type="image/webp" srcset="/?assets/logo-2x\\.webp(?:\\?[^ ]*)? 2x, /?assets/logo-3x\\.webp(?:\\?[^ ]*)? 3x"><img src="/?assets/logo\\.png(?:\\?[^"]*)?" alt="NexusNova Tools Logo" width="1040" height="345"(?: loading="lazy" decoding="async")? class="' + className + '"></picture>');
    assert.ok(pattern.test(html), className + ' keeps the original accessible PNG fallback and intrinsic dimensions');
  }
  assert.ok(/content="https:\/\/nexusnovatools\.com\/assets\/logo\.png(?:\?[^"]*)?"/.test(html), 'social preview image URL remains valid and cache-busted');
});

test('global footer copyright text meets WCAG AA normal-text contrast', () => {
  const css = fs.readFileSync('assets/css/footer-social.css', 'utf8');
  const match = css.match(/\.nn-global-footer \.nn-global-footer-bottom\s*\{([^}]*)\}/);
  assert.ok(match, 'global footer bottom styles must remain explicit');
  const colorMatch = match[1].match(/color:\s*(#[0-9a-f]{6})\s*!important/i);
  assert.ok(colorMatch, 'global footer copyright color must be explicit');
  const rgb = colorMatch[1].slice(1).match(/../g).map(value => parseInt(value, 16) / 255);
  const channel = value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  const luminance = 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
  const contrast = 1.05 / (luminance + 0.05);
  assert.ok(contrast >= 4.5, 'global footer copyright contrast must be at least 4.5:1 (got ' + contrast.toFixed(2) + ':1)');
});

test('app and tools hero/footer use responsive WebP logos and preserve each page social image', () => {
  const source = /<source type="image\/webp" srcset="\/?assets\/logo-2x\.webp(?:\?[^ ]*)? 2x, \/?assets\/logo-3x\.webp(?:\?[^ ]*)? 3x">/g;
  for (const path of ['app.html', 'tools.html']) {
    const html = fs.readFileSync(path, 'utf8');
    assert.equal((html.match(source) || []).length, 2, path + ' must use responsive logo sources in header and footer');
    for (const className of ['nn-brand-logo-img', 'nn-footer-brand-logo']) {
      const pattern = new RegExp('<picture><source type="image/webp" srcset="/?assets/logo-2x\\.webp(?:\\?[^ ]*)? 2x, /?assets/logo-3x\\.webp(?:\\?[^ ]*)? 3x"><img src="/?assets/logo\\.png(?:\\?[^"]*)?" alt="NexusNova Tools Logo"(?=[^>]*\\bclass="' + className + '")[^>]*></picture>');
      assert.ok(pattern.test(html), path + ' ' + className + ' keeps the PNG fallback and alt text');
    }
    const socialImageMeta = html.match(/<meta\b(?=[^>]*(?:property|name)=["'](?:og:image|twitter:image)["'])[^>]*>/gi) || [];
    assert.ok(socialImageMeta.length > 0, path + ' must keep its existing social image metadata');
    const expectedSocialImage = path === 'app.html'
      ? 'https://nexusnovatools.com/assets/nexusnova-logo-512.svg'
      : 'https://nexusnovatools.com/assets/logo.png';
    for (const meta of socialImageMeta) {
      assert.ok(meta.includes(expectedSocialImage), path + ' social image URL stays unchanged');
      assert.ok(!meta.includes('.webp'), path + ' social metadata does not use responsive WebP');
    }
  }
});

test('homepage Lighthouse workflow compares AdSense locally without changing production or weakening budgets', () => {
  const workflow = fs.readFileSync('.github/workflows/site-performance-audit.yml', 'utf8');
  for (const token of [
    'Diagnose homepage AdSense contribution (temporary local copy only)',
    'LOCAL LIGHTHOUSE DIAGNOSTIC ONLY: AdSense network disabled for this run.',
    'performance-artifacts/diagnostics/home-no-ads-${run}.json',
    "'tbt_ms_max': 600",
    "'lcp_ms_max': 4000",
    "if failures:",
    'delta_baseline_minus_no_ads',
    'no_ads_median',
    'No static AdSense tag found; AdSense differential diagnostic is not applicable.',
    'AdSense differential diagnostic: NOT APPLICABLE (no static tag in index.html).'
  ]) assert.ok(workflow.includes(token), token);
  assert.ok(workflow.indexOf('Run representative Lighthouse audits') < workflow.indexOf('Diagnose homepage AdSense contribution'))
  assert.ok(workflow.indexOf('Diagnose homepage AdSense contribution') < workflow.indexOf('Enforce lab performance budgets'))
});


test('homepage defers the decorative WebGL runtime and model until explicit user intent', () => {
  const script = fs.readFileSync('assets/js/humanproof-home.js', 'utf8');
  assert.ok(script.includes('data-hp-v20-load'), '3D scan must expose an explicit load control');
  assert.ok(script.includes("loading.addEventListener('click'"), 'only a user click should start the 3D scan');
  assert.ok(script.includes('void initV20()'), 'the existing interactive scan remains available after activation');
  assert.ok(!script.includes('window.requestIdleCallback(startV20'), 'idle time alone must not initialize WebGL');
  assert.ok(!script.includes('window.setTimeout(startV20,700)'), 'fallback timers must not auto-start the heavy model');
  assert.ok(script.includes('LeePerrySmith/LeePerrySmith.glb'), 'the model remains available');
  assert.ok(!script.includes('three.js@master/'), 'external model source must be pinned to a stable release');
});


test('the visible homepage HumanProof scan loads only after explicit click or keyboard activation', () => {
  const homepage = fs.readFileSync('index.html', 'utf8');
  const script = fs.readFileSync('assets/js/humanproof-hero-360.js', 'utf8');
  assert.ok(!homepage.includes('data-hp-360-autostart'), 'the homepage must not auto-start the main 3D scan when it enters view');
  assert.match(homepage, /id="nnHumanProof360Load"[^>]*>Click to load 3D human scan…<\/div>/, 'the initial state must explain that the scan is user-triggered');
  assert.ok(!homepage.includes('<script type="module" src="assets/js/humanproof-hero-360.js'), 'the non-critical 3D module must not be fetched during initial load');
  assert.ok(homepage.includes("const scriptUrl = 'assets/js/humanproof-hero-360.js?v=20261026-user-intent-v1'"), 'the 3D module loads only after a deliberate action');
  assert.ok(homepage.includes("load.addEventListener('click', requestScan)"), 'a deliberate click must remain supported');
  assert.ok(homepage.includes("load.addEventListener('keydown', requestScan)"), 'keyboard activation must trigger the deferred load');
  assert.ok(script.includes("load.addEventListener('click',start,{once:true})"), 'the existing scan activation remains supported');
  assert.ok(script.includes("load.addEventListener('keydown',event=>"), 'keyboard activation must remain supported');
  assert.ok(script.includes("CLICK TO LOAD 3D HUMAN SCAN"), 'the loader announces the explicit action after initialization');
});

test('live production audit uses authenticated PageSpeed evidence and bounded transient retries', () => {
  const workflow = fs.readFileSync('.github/workflows/live-production-audit.yml', 'utf8');
  for (const token of [
    'PAGESPEED_API_KEY: ${{ secrets.PAGESPEED_API_KEY }}',
    'GOOGLE_SERVICE_ACCOUNT_JSON: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_JSON }}',
    "scopes=['openid']",
    "('category','performance')",
    "('category','seo')",
    'delay=30 * (2 ** attempt)',
    'socket.gaierror',
    'attempts=4',
    'PageSpeed live lab evidence incomplete for: '
  ]) assert.ok(workflow.includes(token), token);
  assert.ok(
    !workflow.includes("'category': 'performance' if strategy == 'mobile' else 'seo'"),
    'both mobile and desktop requests must include the performance category'
  );
  assert.ok(workflow.includes('if failed:'), 'incomplete live lab evidence must fail the audit gate');
});

test('live PageSpeed evidence includes bounded, redacted LCP and blocking diagnostics', () => {
  const workflow = fs.readFileSync('.github/workflows/live-production-audit.yml', 'utf8');
  for (const token of [
    "'largest-contentful-paint-element'",
    "'lcp-discovery-insight'",
    "'lcp-breakdown-insight'",
    "'render-blocking-resources'",
    "'unused-javascript'",
    "'unused-css-rules'",
    "'uses-optimized-images'",
    "'third-party-summary'",
    "'diagnostics':diagnostics",
    "urlunsplit((parts.scheme,parts.netloc,parts.path,'',''))",
    'items[:5]'
  ]) assert.ok(workflow.includes(token), token);
});

test('local Lighthouse server mirrors production gzip compression and cache headers', () => {
  const workflow = fs.readFileSync('.github/workflows/site-performance-audit.yml', 'utf8');
  for (const token of [
    'Start production-like compressed local website server',
    "protocol_version = 'HTTP/1.1'",
    'gzip.compress(source.read(), compresslevel=6, mtime=0)',
    "self.send_header('Content-Encoding', 'gzip')",
    "self.send_header('Cache-Control', 'max-age=600')",
    'python3 /tmp/nexusnova-static-server.py',
    'Production-like local response verified: gzip compression and max-age=600 cache header.'
  ]) assert.ok(workflow.includes(token), token);
  assert.ok(!workflow.includes('python3 -m http.server 8000'), 'do not benchmark uncompressed HTML against compressed GitHub Pages production');
});

test('homepage search builds its fallback index only after search intent, without breaking keyboard access', () => {
  const homepage = fs.readFileSync('index.html', 'utf8');
  const marker = "var lazySearchRoot = document.querySelector('[data-nexusnova-search-root]');";
  const markerIndex = homepage.indexOf(marker);
  const start = homepage.lastIndexOf('<script', markerIndex);
  const end = homepage.indexOf('</script>', markerIndex);
  assert.ok(markerIndex >= 0 && start >= 0 && end > markerIndex, 'homepage search bootstrap must exist');
  const script = homepage.slice(start, end);
  for (const token of [
    "var lazySearchRoot = document.querySelector('[data-nexusnova-search-root]');",
    "lazySearchRoot.addEventListener('pointerdown', initializeOnSearchIntent, { once: true });",
    "lazySearchRoot.addEventListener('focusin', initializeOnSearchIntent, { once: true });",
    "function initializeHomepageSearch()",
    'new window.NexusNovaSearchCore()',
    "input.addEventListener('input', runQuery)",
    "event.key.toLowerCase() === 'k'",
    'yearNodes.forEach(function (node)'
  ]) assert.ok(script.includes(token), token);
  assert.ok(!script.includes("document.addEventListener('DOMContentLoaded', function ()"), 'homepage search index must not initialize on DOMContentLoaded');
});

test('homepage downloads the deep search index only on first search intent and resumes queued input', () => {
  const homepage = fs.readFileSync('index.html', 'utf8');
  const marker = "var lazySearchRoot = document.querySelector('[data-nexusnova-search-root]');";
  const markerIndex = homepage.indexOf(marker);
  const scriptStart = homepage.lastIndexOf('<script', markerIndex);
  const scriptEnd = homepage.indexOf('</script>', markerIndex);
  assert.ok(markerIndex >= 0 && scriptStart >= 0 && scriptEnd > markerIndex, 'homepage search bootstrap must exist');
  const bootstrap = homepage.slice(scriptStart, scriptEnd);
  assert.ok(!homepage.includes('<script src="assets/js/search-core.js?v=20261015-v4" defer></script>'),
    'search-core must not be downloaded on every homepage visit');
  assert.ok(!homepage.includes('<link rel="preload" href="assets/js/search-core.js?v=20261015-v4" as="script">'),
    'search-core must not be preloaded before the visitor uses search');
  for (const token of [
    "searchCoreScript.src = '/assets/js/search-core.js?v=20261015-v4'",
    'searchCoreScript.async = true',
    'searchCoreScript.onload = initializeHomepageSearch',
    'searchCoreScript.onerror = initializeHomepageSearch',
    'if (typeof window.NexusNovaSearchCore === \'function\')',
    'if (input.value.trim()) runQuery();',
    "lazySearchRoot.addEventListener('pointerdown', initializeOnSearchIntent, { once: true });",
    "lazySearchRoot.addEventListener('focusin', initializeOnSearchIntent, { once: true });"
  ]) assert.ok(bootstrap.includes(token), token);
});


test('homepage has complementary WebPage JSON-LD and lazy-loads only the offscreen footer logo', () => {
  const homepage = fs.readFileSync('index.html', 'utf8');
  const orgBlock = homepage.match(/<script type="application\/ld\+json" data-nexusnova-organization>([\s\S]*?)<\/script>/i);
  const pageBlock = homepage.match(/<script type="application\/ld\+json" data-nexusnova-webpage>([\s\S]*?)<\/script>/i);
  assert.ok(orgBlock, 'existing Organization schema remains present');
  assert.ok(pageBlock, 'homepage gets a separate WebPage schema');
  const org = JSON.parse(orgBlock[1]);
  const page = JSON.parse(pageBlock[1]);
  assert.equal(org['@type'], 'Organization');
  assert.equal(page['@type'], 'WebPage');
  assert.equal(page.url, 'https://nexusnovatools.com/');
  assert.equal(page.name, 'NexusNova Tools — 109 Free Online Browser Tools & PDFs');
  assert.equal(page.publisher['@id'], 'https://nexusnovatools.com/#organization');
  assert.equal(page.about['@id'], 'https://nexusnovatools.com/#organization');
  assert.match(page.description, /109 free online browser tools/);

  const header = homepage.match(/<picture>[\s\S]*?<img[^>]*class="nn-brand-logo-img"[^>]*>[\s\S]*?<\/picture>/i)?.[0] || '';
  const footer = homepage.match(/<picture>[\s\S]*?<img[^>]*class="nn-footer-brand-logo"[^>]*>[\s\S]*?<\/picture>/i)?.[0] || '';
  assert.ok(header, 'header logo remains present');
  assert.ok(footer, 'footer logo remains present');
  assert.doesNotMatch(header, /\bloading="lazy"/i, 'header/LCP logo stays eager');
  assert.match(footer, /\bloading="lazy"\s+decoding="async"/i, 'footer logo loads when needed');
});

test('homepage reserves space for the backend-driven launch offer and skips obsolete HumanProof home assets', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('assets/css/seo-audit-launch.css', 'utf8');
  const script = fs.readFileSync('assets/js/seo-audit-launch.js', 'utf8');
  const bootstrap = fs.readFileSync('assets/js/auth-header-state.js', 'utf8');
  assert.match(html, /id="nnAuditLaunchOffer" class="nn-audit-launch-offer" data-pending aria-hidden="true" aria-live="polite"/);
  assert.match(css, /\.nn-audit-launch-offer\[data-pending\]\{visibility:hidden;min-height:280px/);
  assert.match(css, /\.nn-audit-launch \.nn-audit-launch-offer\[data-pending\]\{min-height:320px\}/);
  assert.match(css, /@media\(max-width:350px\)[\s\S]*?min-height:390px/);
  assert.match(css, /@media\(min-width:351px\) and \(max-width:359px\)[\s\S]*?min-height:370px/);
  assert.match(script, /const revealOffer=\(\)=>\{/);
  assert.match(script, /offerBox\.removeAttribute\('data-pending'\)/);
  assert.match(script, /offerBox\.removeAttribute\('aria-hidden'\)/);
  assert.doesNotMatch(html, /assets\/css\/humanproof-home\.css/);
  assert.doesNotMatch(html, /assets\/js\/humanproof-home\.js/);
  assert.match(bootstrap, /document\.querySelector\('\.nn-command-hero'\)/);
});

test('homepage caches current launch assets, keeps async offer growth below the CTA row, and meets label accessibility basics', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('assets/css/seo-audit-launch.css', 'utf8');
  assert.ok(html.includes('assets/css/seo-audit-launch.css?v=20261027-cls-reserve-v1'));
  assert.ok(html.includes('assets/js/seo-audit-launch.js?v=20261026-live-cls-a11y-v1'));
  assert.match(html, /class="nn-audit-launch-actions"[\s\S]*?<\/div>\s*<div id="nnAuditLaunchOffer"/);
  assert.ok(html.includes('aria-label="Owner Console">Owner Console'));
  assert.match(html, /\.nn-step-label\{\r?\n\s*display:block;color:var\(--nn-muted\);/,
    'step label layout style remains explicit before first paint');
  assert.ok(css.includes('.nn-audit-product-wordmark small{color:#526176;'));
  assert.ok(css.includes('gap:9px;color:#526176;'));
  assert.ok(css.includes('margin-left:auto;color:#526176;'));
  assert.ok(css.includes('.nn-audit-home-help{margin:7px 0 0;color:#526176;'));
  assert.ok(css.includes('WCAG AA contrast for small homepage metadata labels'));
});

test('broad site cleanup preserves deliberate performance and related-content cache keys', () => {
  const { spawnSync } = require('node:child_process');
  const os = require('node:os');
  const root = path.resolve(__dirname, '..');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexusnova-cache-bust-'));
  const python = [
    'import importlib.util, pathlib, sys',
    'spec = importlib.util.spec_from_file_location("overhaul", sys.argv[1])',
    'module = importlib.util.module_from_spec(spec)',
    'spec.loader.exec_module(module)',
    'root = pathlib.Path(sys.argv[2])',
    'module.ROOT = root',
    'fixtures = {',
    "\"index.html\": \"<link rel='stylesheet' href='assets/css/seo-audit-launch.css?v=old'><script src='assets/js/seo-audit-launch.js?v=old'></script><script src='assets/js/main.js?v=old&lcpAds=old'></script>\",",
    "\"seo-audit-studio.html\": \"<script src='assets/js/analytics.js?v=old'></script>\",",
    "\"app.html\": \"<script src='assets/js/site-main.js?v=old'></script>\",",
    "\"tools.html\": \"<script src='assets/js/other.js?v=old'></script>\"",
    '}',
    'for name, content in fixtures.items(): (root / name).write_text(content, encoding="utf-8")',
    'module.cache_bust()',
    'for name in fixtures: print(name + "=" + (root / name).read_text(encoding="utf-8"))'
  ].join('\n');
  try {
    const scriptPath = path.join(root, '.github/scripts/total_site_overhaul.py');
    const result = spawnSync(process.env.PYTHON || 'python3', ['-c', python, scriptPath, temp], {
      cwd: root, encoding: 'utf8', timeout: 15000
    });
    assert.equal(result.error, undefined, 'cache-bust test process did not start: ' + (result.error?.message || ''));
    assert.equal(result.status, 0, 'cache-bust fixture failed:\n' + result.stdout + '\n' + result.stderr);
    assert.ok(result.stdout.includes('seo-audit-launch.css?v=20261026-live-cls-a11y-v1'), 'launch CSS keeps its measured cache key');
    assert.ok(result.stdout.includes('seo-audit-launch.js?v=20261026-live-cls-a11y-v1'), 'launch JS keeps its measured cache key');
    assert.ok(result.stdout.includes('main.js?v=20261015-v4&lcpAds=20261022-v2'), 'homepage runtime preserves its LCP cache key');
    assert.ok(result.stdout.includes('analytics.js?v=20261016-related-content-v1'), 'analytics preserves its related-content cache key');
    assert.ok(result.stdout.includes('site-main.js?v=20261018-app-consent-lcp-v1'), 'app runtime preserves its consent/LCP cache key');
    assert.ok(result.stdout.includes('other.js?v=20261015-v4'), 'ordinary assets still receive the shared cache key');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});


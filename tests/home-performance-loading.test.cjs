const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('homepage preconnects to its early third-party script origins', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.ok(html.includes('rel="preconnect" href="https://pagead2.googlesyndication.com" crossorigin'));
  assert.ok(html.includes('rel="preconnect" href="https://www.googletagmanager.com" crossorigin'));
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
    const pattern = new RegExp('<picture><source type="image/webp" srcset="/?assets/logo-2x\\.webp(?:\\?[^ ]*)? 2x, /?assets/logo-3x\\.webp(?:\\?[^ ]*)? 3x"><img src="/?assets/logo\\.png(?:\\?[^"]*)?" alt="NexusNova Tools Logo" width="1040" height="345" class="' + className + '"></picture>');
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
      const pattern = new RegExp('<picture><source type="image/webp" srcset="/?assets/logo-2x\\.webp(?:\\?[^ ]*)? 2x, /?assets/logo-3x\\.webp(?:\\?[^ ]*)? 3x"><img src="/?assets/logo\\.png(?:\\?[^"]*)?" alt="NexusNova Tools Logo"(?: width="1040" height="345")? class="' + className + '"></picture>');
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
  assert.ok(homepage.includes('id="nnHumanProof360Load">Click to load 3D human scan…</div>'), 'the initial state must explain that the scan is user-triggered');
  assert.ok(script.includes("load.addEventListener('click',start,{once:true})"), 'a deliberate click must remain supported');
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

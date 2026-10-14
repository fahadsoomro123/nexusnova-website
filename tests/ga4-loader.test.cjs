const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('public HumanProof page loads the canonical main bootstrap', () => {
  const text = fs.readFileSync('humanproof.html', 'utf8');
  assert.ok(text.includes('<script src="assets/js/main.js" defer></script>'));
});

test('GA4 bootstrap preserves the measurement ID, privacy defaults and single-load guard', () => {
  const wrapper = fs.readFileSync('assets/js/main.js', 'utf8');
  const required = [
    "const measurementId='G-YLPFKWSS12';",
    "const consentKey='nexusnova_analytics_consent_v1';",
    'window.dataLayer=window.dataLayer||[];',
    'window.gtag=window.gtag||function',
    "window.gtag('consent','default',{",
    "analytics_storage:readSavedAnalyticsChoice()==='granted'?'granted':'denied'",
    'const readSavedAnalyticsChoice=()=>{',
    'wait_for_update:500',
    "window.gtag('consent','update',{",
    "ad_storage:'denied'",
    "ad_user_data:'denied'",
    "ad_personalization:'denied'",
    "window.gtag('js',new Date())",
    'googletagmanager.com/gtag/js?id=',
    "window.gtag('config',measurementId,{",
    'send_page_view:true',
    'allow_google_signals:false',
    'allow_ad_personalization_signals:false',
    'ads_data_redaction:true',
    'window.__nexusnovaConsentReady=true',
    'window.__nexusnovaLoadAnalytics=granted=>{',
    'if(window.__nexusnovaGa4BootstrapReady)return;',
    'window.__nexusnovaGa4BootstrapReady=true;',
    "script[data-nexusnova-ga4]"
  ];
  for (const token of required) assert.ok(wrapper.includes(token), token);
  assert.ok(!wrapper.includes('const mountChoices=()=>{'));
});

test('legacy site shell delegates analytics loading through the canonical GA4 bridge', () => {
  const text = fs.readFileSync('assets/js/site-main.js', 'utf8');
  for (const token of [
    "const measurementId='G-YLPFKWSS12';",
    'nexusnova_analytics_consent_v1',
    'window.__nexusnovaLoadAnalytics',
    'data-consent-allow'
  ]) assert.ok(text.includes(token), token);
});

test('tool analytics detail events require the explicit analytics opt-in', () => {
  const text = fs.readFileSync('assets/js/tool-analytics.js', 'utf8');
  assert.ok(text.includes('const detailAllowed=()=>{'));
  assert.ok(text.includes("localStorage.getItem('nexusnova_analytics_consent_v1')==='granted'"));
  assert.ok(text.includes("const allowed=()=>typeof window.gtag==='function'&&detailAllowed();"));
});

test('automatic GA4 configuration cannot initialize twice on the same page', () => {
  const text = fs.readFileSync('assets/js/main.js', 'utf8');
  const guard = text.indexOf('if(window.__nexusnovaGa4BootstrapReady)return;');
  const initialized = text.indexOf('window.__nexusnovaGa4BootstrapReady=true;');
  assert.ok(guard >= 0 && initialized > guard, 'bootstrap singleton guard must run before initialization');
  assert.ok(text.includes("script[data-nexusnova-ga4]"));
  assert.ok(text.includes("script[data-nexusnova-site-shell]"));
  assert.ok(!text.includes('analyticsLoaded=false'));
});

test('GA4 external loader only runs on the owned production hostname', () => {
  const wrapper = fs.readFileSync('assets/js/main.js', 'utf8');
  const productionHostGuard = "const isProductionAnalyticsHost=/^(?:www\\.)?nexusnovatools\\.com$/i.test(location.hostname);";
  assert.ok(wrapper.includes(productionHostGuard), 'GA4 loader must have an explicit production-host allowlist');

  const hostPattern = /^(?:www\.)?nexusnovatools\.com$/i;
  for (const host of ['nexusnovatools.com', 'www.nexusnovatools.com', 'NEXUSNOVATOOLS.COM']) {
    assert.equal(hostPattern.test(host), true, host);
  }
  for (const host of ['raw.githack.com', 'github.io', 'localhost', '127.0.0.1', 'nexusnovatools.com.evil.example', 'preview.nexusnovatools.com']) {
    assert.equal(hostPattern.test(host), false, host);
  }
  assert.ok(wrapper.includes("if(isProductionAnalyticsHost&&!document.querySelector('script[data-nexusnova-ga4]')){"));
  assert.ok(wrapper.includes("const measurementId='G-YLPFKWSS12';"), 'measurement ID must remain unchanged');
});

test('homepage requests the current consent-aware production bootstrap', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.ok(html.includes('assets/js/main.js?v=20261014-main-thread-idle-v1'));
  assert.ok(!html.includes('assets/js/main.js?v=20261013-ga4-hostguard-v3'));
  assert.ok(!html.includes('assets/js/main.js?v=20261005-ga4a'));
});

test('homepage inline consent defaults deny analytics unless a saved explicit opt-in exists', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.ok(html.includes("var nexusnovaAnalyticsStorage = 'denied';"));
  assert.ok(html.includes("window.localStorage.getItem('nexusnova_analytics_consent_v1') === 'granted'"));
  assert.ok(html.includes('assets/js/main.js?v=20261014-main-thread-idle-v1'));
  assert.ok(!html.includes("analytics_storage: 'granted'"));
});

test('previously uninstrumented public hubs load the standalone analytics and choice UI', () => {
  for (const path of ['tools.html', 'categories.html', 'guides.html', 'whatsapp-link-generator.html']) {
    const html = fs.readFileSync(path, 'utf8');
    assert.ok(html.includes('assets/js/analytics.js?v=20261014-explicit-opt-in-v1'), path + ' loader');
  }
});

test('standalone GA4 loader defaults denied, persists explicit consent and only runs on NexusNova production', () => {
  const loader = fs.readFileSync('assets/js/analytics.js', 'utf8');
  for (const token of [
    "const measurementId='G-YLPFKWSS12';",
    "const consentKey='nexusnova_analytics_consent_v1';",
    "analytics_storage:readChoice()==='granted'?'granted':'denied'",
    "window.gtag('consent','update',{",
    "window.__nexusnovaOptInEventRequested=true;",
    'if(window.__nexusnovaGa4BootstrapReady)return;',
    'window.__nexusnovaGa4BootstrapReady=true;',
    "const isProductionAnalyticsHost=/^(?:www\\.)?nexusnovatools\\.com$/i.test(location.hostname);",
    "if(isProductionAnalyticsHost&&!document.querySelector('script[data-nexusnova-ga4]')){",
    'Keep basic measurement',
    'Allow detailed analytics'
  ]) assert.ok(loader.includes(token), token);
  assert.ok(!loader.includes("analytics_storage:'granted'"), 'fresh visitors must default denied');
});

test('detailed opt-in event is fired by an explicit choice, not on every page load', () => {
  const wrapper = fs.readFileSync('assets/js/main.js', 'utf8');
  const shell = fs.readFileSync('assets/js/site-main.js', 'utf8');
  const handler = wrapper.slice(wrapper.indexOf('window.__nexusnovaLoadAnalytics=granted=>{'), wrapper.indexOf('const hydrateDynamicLinks='));
  assert.ok(!handler.includes("window.gtag('event','analytics_detail_opt_in'"));
  assert.ok(shell.includes("window.gtag('event','analytics_detail_opt_in',{detail_level:'enhanced'})"));
});

test('production GA4 verifier waits for deployed assets and inspects POST events without weakening realtime gate', () => {
  const workflow = fs.readFileSync('.github/workflows/privacy-analytics-production.yml', 'utf8');
  const deployShaToken = 'DEPLOY_SHA: ' + '$' + '{{ github.sha }}';
  for (const token of [
    'Wait for the matching Pages deployment before live browser checks',
    deployShaToken,
    "('/', 'assets/js/main.js?v=20261014-main-thread-idle-v1')",
    "GA4_QA_VERSION: '20261014-main-thread-idle-v1'",
    "('/tools.html', 'assets/js/analytics.js?v=20261014-explicit-opt-in-v1')",
    "('/categories.html', 'assets/js/analytics.js?v=20261014-explicit-opt-in-v1')",
    "('/guides.html', 'assets/js/analytics.js?v=20261014-explicit-opt-in-v1')",
    "('/whatsapp-link-generator.html', 'assets/js/analytics.js?v=20261014-explicit-opt-in-v1')",
    "def add_collect_events(q,method,source):",
    "body_chunks=[chunk.strip() for chunk in post_data.splitlines() if chunk.strip()]",
    "optInEventCallback:window.__nexusnovaOptInEventCallback===true",
    "optInEventCommand:eventCommands.includes('analytics_detail_opt_in')",
    "'httpStatusCounts':{}",
    "rt['apiErrors'].append",
    "payload={'dimensions':[{'name':'eventName'}],'metrics':[{'name':'eventCount'}],'limit':25}",
    "assert rt['success'], 'GA4 Realtime did not observe explicit opt-in in the existing property'"
  ]) assert.ok(workflow.includes(token), token);
});

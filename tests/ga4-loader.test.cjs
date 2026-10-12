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
    "analytics_storage:analyticsStorageDefault",
    "const readSavedAnalyticsChoice=()=>{",
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
  assert.ok(!wrapper.includes("analytics_storage:'granted'"), 'no silent default grant');
  assert.ok(wrapper.includes("analytics_storage:granted?'granted':'denied'"), 'user choice must update consent');
  assert.ok(!wrapper.includes("window.gtag('event','analytics_detail_opt_in'"), 'opt-in event must not fire on every page load');
  assert.ok(!wrapper.includes('const mountChoices=()=>{'));
});

test('representative public hubs load the shared analytics bootstrap', () => {
  for (const path of ['categories.html', 'guides.html', 'tools.html', 'whatsapp-link-generator.html']) {
    const text = fs.readFileSync(path, 'utf8');
    assert.ok(text.includes('assets/js/analytics.js?v=20261012-anonymous-baseline'), path);
  }
});

test('homepage starts cookieless unless the visitor saved a detailed-analytics opt-in', () => {
  const text = fs.readFileSync('index.html', 'utf8');
  assert.ok(text.includes("var nexusnovaAnalyticsStorage = 'denied';"));
  assert.ok(text.includes("window.localStorage.getItem('nexusnova_analytics_consent_v1') === 'granted'"));
  assert.ok(text.includes("analytics_storage: nexusnovaAnalyticsStorage"));
  assert.ok(!text.includes("analytics_storage: 'granted'"));
});

test('legacy site shell applies explicit consent changes through the canonical GA4 bridge', () => {
  const text = fs.readFileSync('assets/js/site-main.js', 'utf8');
  for (const token of [
    "const measurementId='G-YLPFKWSS12';",
    'nexusnova_analytics_consent_v1',
    'window.__nexusnovaLoadAnalytics',
    'data-consent-allow',
    "window.gtag('event','analytics_detail_opt_in'"
  ]) assert.ok(text.includes(token), token);
});

test('standalone analytics loader provides anonymous defaults and an explicit privacy-choice control', () => {
  const text = fs.readFileSync('assets/js/analytics.js', 'utf8');
  assert.ok(text.includes("const measurementId='G-YLPFKWSS12';"));
  assert.ok(text.includes("analytics_storage:readChoice()==='granted'?'granted':'denied'"));
  assert.ok(text.includes("window.gtag('consent','update'"));
  assert.ok(text.includes('send_page_view:true'));
  assert.ok(text.includes('data-nexusnova-consent'));
  assert.ok(text.includes('Privacy choices'));
  assert.ok(text.includes('data-consent-allow'));
  assert.ok(text.includes('data-consent-deny'));
  assert.ok(text.includes("window.gtag('event','analytics_detail_opt_in'"));
  assert.ok(!text.includes('site-main.js'));
});

test('Cloudflare anonymous baseline provisioning covers both analytics entry points', () => {
  const text = fs.readFileSync('.github/workflows/provision-cloudflare-web-analytics.yml', 'utf8');
  assert.ok(text.includes('workflow_dispatch:'));
  assert.ok(text.includes("'assets/js/main.js'"));
  assert.ok(text.includes("'assets/js/analytics.js'"));
  assert.ok(text.includes("for filename in ('assets/js/main.js','assets/js/analytics.js')"));
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
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
    "analytics_storage:'granted'",
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

test('homepage requests the current production-host-guard bootstrap', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.ok(html.includes('assets/js/main.js?v=20261013-ga4-hostguard-v3'));
  assert.ok(!html.includes('assets/js/main.js?v=20261005-ga4a'));
});

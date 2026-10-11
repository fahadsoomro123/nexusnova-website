const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('public HumanProof page loads the canonical main bootstrap', () => {
  const text = fs.readFileSync('humanproof.html', 'utf8');
  assert.ok(text.includes('<script src="assets/js/main.js" defer></script>'));
});

test('GA4 bootstrap keeps one automatic page_view and disables advertising signals', () => {
  const wrapper = fs.readFileSync('assets/js/main.js', 'utf8');
  const required = [
    "const measurementId='G-YLPFKWSS12';",
    'window.dataLayer=window.dataLayer||[];',
    'window.gtag=window.gtag||function',
    "window.gtag('consent','default',{",
    "analytics_storage:'granted'",
    "ad_storage:'denied'",
    "ad_user_data:'denied'",
    "ad_personalization:'denied'",
    'googletagmanager.com/gtag/js?id=',
    "analyticsScript.onload=()=>window.gtag('config',measurementId,{",
    'send_page_view:true',
    'allow_google_signals:false',
    'allow_ad_personalization_signals:false',
    'ads_data_redaction:true'
  ];
  for (const token of required) assert.ok(wrapper.includes(token), token);
  assert.ok(wrapper.includes('if(window.__nexusnovaGa4BootstrapReady)return;'));
  assert.ok(wrapper.includes('window.__nexusnovaGa4BootstrapReady=true;'));
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

test('enhanced tool analytics require explicit opt-in but basic page views remain independent', () => {
  const text = fs.readFileSync('assets/js/tool-analytics.js', 'utf8');
  assert.ok(text.includes("localStorage.getItem('nexusnova_analytics_consent_v1')==='granted'"));
  assert.ok(text.includes("const allowed=()=>typeof window.gtag==='function'&&detailAllowed();"));
  assert.ok(text.includes("window.gtag('event',name,{tool,action});"));
  assert.ok(!text.includes("localStorage.getItem(consentKey)==='granted'"));
});

test('automatic GA4 config is guarded against duplicate initialization', () => {
  const text = fs.readFileSync('assets/js/main.js', 'utf8');
  for (const token of [
    '__nexusnovaConsentReady',
    '__nexusnovaGa4BootstrapReady',
    "if(!document.querySelector('script[data-nexusnova-ga4]')){",
    "analyticsScript.dataset.nexusnovaGa4='';",
    "send_page_view:true"
  ]) assert.ok(text.includes(token), token);
});

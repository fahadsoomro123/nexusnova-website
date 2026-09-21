const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('public HumanProof page loads the canonical main bootstrap', () => {
  const text = fs.readFileSync('humanproof.html', 'utf8');
  assert.ok(text.includes('<script src="assets/js/main.js" defer></script>'));
});

test('GA4 bootstrap keeps the existing measurement ID and automatic page_view path', () => {
  const wrapper = fs.readFileSync('assets/js/main.js', 'utf8');
  const required = [
    "const measurementId='G-YLPFKWSS12';",
    'window.dataLayer=window.dataLayer||[];',
    'window.gtag=window.gtag||function',
    "window.gtag('js',new Date())",
    'googletagmanager.com/gtag/js?id=',
    "window.gtag('config',measurementId,{",
    'send_page_view:true',
    'window.__nexusnovaConsentReady=true',
    'window.__nexusnovaLoadAnalytics=',
    'pointerdown',
    'setTimeout(enable,5000)',
    'window.__nexusnovaAnalyticsAutoEnabled=true',
    'nexusnova-analytics-auto-enabled'
  ];
  for (const token of required) assert.ok(wrapper.includes(token), token);
  assert.ok(!wrapper.includes('__nexusnovaGa4BootstrapReady'));
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

test('tool analytics events are not blocked by the old consent gate', () => {
  const text = fs.readFileSync('assets/js/tool-analytics.js', 'utf8');
  assert.ok(text.includes("const allowed=()=>typeof window.gtag==='function';"));
  assert.ok(!text.includes("localStorage.getItem(consentKey)==='granted'"));
});

test('automatic GA4 config cannot initialize twice on the same page', () => {
  const text = fs.readFileSync('assets/js/main.js', 'utf8');
  for (const token of [
    '__nexusnovaConsentReady',
    'analyticsLoaded=false',
    'data-nexusnova-ga4',
    'data-nexusnova-site-shell'
  ]) assert.ok(text.includes(token), token);
});

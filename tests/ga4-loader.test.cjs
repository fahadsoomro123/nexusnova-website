const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('public HumanProof page loads the canonical main bootstrap', () => {
  const text = fs.readFileSync('humanproof.html', 'utf8');
  assert.match(text, /<script src="assets\/js\/main\.js" defer><\/script>/);
});

test('GA4 loads automatically with the existing measurement ID and one page_view config', () => {
  const wrapper = fs.readFileSync('assets/js/main.js', 'utf8');
  assert.match(wrapper, /const measurementId='G-YLPFKWSS12';/);
  assert.match(wrapper, /window\.dataLayer=window\.dataLayer\|\|\[\];/);
  assert.match(wrapper, /window\.gtag=window\.gtag\|\|function/);
  assert.match(wrapper, /window\.gtag\('js',new Date\(\)\)/);
  assert.match(wrapper, /googletagmanager\.com\/gtag\/js\?id=/);
  assert.match(wrapper, /window\.gtag\('config',measurementId,\{/);
  assert.match(wrapper, /send_page_view:true/);
  assert.match(wrapper, /window\.__nexusnovaGa4BootstrapReady/);
  assert.match(wrapper, /window\.__nexusnovaConsentReady=true/);
  assert.match(wrapper, /assets\/js\/site-main\.js\?v=/);
  assert.doesNotMatch(wrapper, /analytics_storage:'denied'/);
  assert.doesNotMatch(wrapper, /Allow detailed analytics/);
  assert.doesNotMatch(wrapper, /Keep basic measurement/);
  assert.doesNotMatch(wrapper, /nexusnova_analytics_consent_v1/);
});

test('legacy site shell retains all non-analytics site behavior in one canonical file', () => {
  const text = fs.readFileSync('assets/js/site-main.js', 'utf8');
  assert.match(text, /const measurementId='G-YLPFKWSS12';/);
  assert.match(text, /nexusnova_analytics_consent_v1/);
  assert.match(text, /loadAnalytics/);
  assert.match(text, /data-consent-allow/);
});

test('tool analytics events are not blocked by the old consent gate', () => {
  const text = fs.readFileSync('assets/js/tool-analytics.js', 'utf8');
  assert.match(text, /const allowed=\(\)=>\{[\s\S]*typeof window\.gtag==='function'/);
  assert.doesNotMatch(text, /localStorage\.getItem\(consentKey\)==='granted'/);
});

test('automatic GA4 config cannot initialize twice on the same page', () => {
  const text = fs.readFileSync('assets/js/main.js', 'utf8');
  assert.match(text, /__nexusnovaGa4BootstrapReady/);
  assert.match(text, /data-nexusnova-ga4/);
  assert.match(text, /data-nexusnova-site-shell/);
});
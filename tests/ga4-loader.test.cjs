const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('public HumanProof page loads the canonical main bootstrap',()=>{
  const text=fs.readFileSync('humanproof.html','utf8');
  assert.match(text,/<script src="assets\/js\/main\.js" defer><\/script>/);
});

test('GA4 bootstrap has Consent Mode defaults and lazy third-party loading',()=>{
  const wrapper=fs.readFileSync('assets/js/main.js','utf8');
  assert.match(wrapper,/const measurementId='G-YLPFKWSS12';/);
  assert.match(wrapper,/const consentKey='nexusnova_analytics_consent_v1';/);
  assert.match(wrapper,/window\.dataLayer=window\.dataLayer\|\|\[\];/);
  assert.match(wrapper,/window\.gtag=window\.gtag\|\|function/);
  assert.match(wrapper,/window\.gtag\('consent','default',\{/);
  assert.match(wrapper,/analytics_storage:'denied'/);
  assert.match(wrapper,/ad_storage:'denied'/);
  assert.match(wrapper,/ad_user_data:'denied'/);
  assert.match(wrapper,/ad_personalization:'denied'/);
  assert.match(wrapper,/wait_for_update:500/);
  assert.match(wrapper,/localStorage\.getItem\(consentKey\)/);
  assert.match(wrapper,/googletagmanager\.com\/gtag\/js\?id=/);
  assert.match(wrapper,/window\.gtag\('config',measurementId,\{/);
  assert.match(wrapper,/send_page_view:true/);
  assert.match(wrapper,/window\.__nexusnovaGa4BootstrapReady/);
  assert.match(wrapper,/__nexusnovaLoadAnalytics/);
  assert.match(wrapper,/pointerdown/);
  assert.match(wrapper,/scroll/);
});

test('site shell owns consent UI and delegates analytics loading to the main bootstrap',()=>{
  const text=fs.readFileSync('assets/js/site-main.js','utf8');
  assert.match(text,/const consentKey='nexusnova_analytics_consent_v1';/);
  assert.match(text,/data-consent-allow/);
  assert.match(text,/data-consent-deny/);
  assert.match(text,/data-consent-dismiss/);
  assert.match(text,/Privacy choices/);
  assert.match(text,/__nexusnovaLoadAnalytics/);
  assert.doesNotMatch(text,/analyticsScript\.src/);
});

test('tool analytics events remain safe before the runtime is fetched',()=>{
  const text=fs.readFileSync('assets/js/tool-analytics.js','utf8');
  assert.match(text,/const allowed=\(\)=>typeof window\.gtag==='function';/);
  assert.doesNotMatch(text,/localStorage\.getItem\(consentKey\)==='granted'/);
});

test('automatic GA4 runtime cannot initialize twice on the same page',()=>{
  const text=fs.readFileSync('assets/js/main.js','utf8');
  assert.match(text,/__nexusnovaGa4BootstrapReady/);
  assert.match(text,/data-nexusnova-ga4/);
  assert.match(text,/data-nexusnova-site-shell/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('public HumanProof page uses the shared consent and analytics bootstrap', () => {
  const text = fs.readFileSync('humanproof.html', 'utf8');
  assert.match(text, /<script src="assets\/js\/main\.js" defer><\/script>/);
});

test('GA4 uses denied-storage basic measurement by default and detailed analytics only after consent', () => {
  const text = fs.readFileSync('assets/js/main.js', 'utf8');
  assert.match(text, /const measurementId='G-YLPFKWSS12';/);
  assert.match(text, /const consentKey='nexusnova_analytics_consent_v1';/);
  assert.match(text, /gtag\('consent','default',\{/);
  assert.match(text, /analytics_storage:'denied'/);
  assert.match(text, /ad_storage:'denied'/);
  assert.match(text, /ad_user_data:'denied'/);
  assert.match(text, /ad_personalization:'denied'/);
  assert.match(text, /const loadAnalytics=\(grantAnalytics=false\)=>\{/);
  assert.match(text, /analyticsScript\.src=`https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=/);
  assert.match(text, /analyticsScript\.onload=\(\)=>window\.gtag\('config',measurementId,\{/);
  assert.doesNotMatch(text, /send_page_view:false/);
  assert.match(text, /data-consent-allow/);
  assert.match(text, /Anonymous measurement is on/);
  assert.match(text, /Allow detailed analytics/);
  assert.match(text, /Keep basic measurement/);
  assert.match(text, /if\(grantAnalytics\)window\.gtag\('consent','update',\{/);
  assert.match(text, /loadAnalytics\(true\)/);
  assert.match(text, /loadAnalytics\(\)/);
  assert.match(text, /data-consent-dismiss/);
  assert.match(text, /banner\.querySelector\('\[data-consent-dismiss\]'\)\?\.addEventListener\('click',hide\)/);
  assert.match(text, /banner\.setAttribute\('role','region'\)/);
  assert.doesNotMatch(text, /banner\.setAttribute\('role','dialog'\)/);
  assert.match(text, /bottom:72px/);
  assert.match(text, /Privacy & Analytics Settings/);
  assert.match(text, /reopen\.title='Privacy choices'/);
  assert.match(text, /const footerLinks=document\.querySelector\('\.site-footer \.footer-links'\)/);
  assert.match(text, /footerLinks\) footerLinks\.appendChild\(reopen\)/);
  assert.match(text, /reopen\.addEventListener\('click',\(\)=>\{banner\.hidden=false/);
  assert.match(text, /saveChoice\('granted'\);loadAnalytics\(true\)/);
  assert.match(text, /if\(initialChoice==='granted'\)loadAnalytics\(true\)/);
  assert.doesNotMatch(text, /setTimeout\(load,8000\)/);
  assert.doesNotMatch(text, /\n  load\(\);\n/);
});

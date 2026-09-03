const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('GA4 stays off by default and loads only after explicit analytics consent', () => {
  const text = fs.readFileSync('assets/js/main.js', 'utf8');
  assert.match(text, /const measurementId='G-YLPFKWSS12';/);
  assert.match(text, /const consentKey='nexusnova_analytics_consent_v1';/);
  assert.match(text, /gtag\('consent','default',\{/);
  assert.match(text, /analytics_storage:'denied'/);
  assert.match(text, /ad_storage:'denied'/);
  assert.match(text, /ad_user_data:'denied'/);
  assert.match(text, /ad_personalization:'denied'/);
  assert.match(text, /const loadAnalytics=\(\)=>\{/);
  assert.match(text, /analyticsScript\.src=`https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=/);
  assert.match(text, /data-consent-allow/);
  assert.match(text, /saveChoice\('granted'\);loadAnalytics\(\)/);
  assert.match(text, /if\(initialChoice==='granted'\)loadAnalytics\(\)/);
  assert.doesNotMatch(text, /setTimeout\(load,8000\)/);
  assert.doesNotMatch(text, /\n  load\(\);\n/);
});

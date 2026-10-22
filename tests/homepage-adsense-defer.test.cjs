'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'assets/js/main.js'), 'utf8');
const measurementId = "G-YLPFKWSS12";
const adsenseUrl = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5070673529890078';

test('homepage no longer starts the AdSense runtime directly in head HTML', () => {
  assert.equal(homepage.includes(adsenseUrl), false);
});

test('homepage cache-busts the updated main bootstrap without changing the shared version token', () => {
  assert.ok(homepage.includes('assets/js/main.js?v=20261015-v4&lcpAds=20261022-v2'));
});

test('shared runtime retains the configured AdSense client on dynamic loading', () => {
  assert.ok(runtime.includes("adsenseScript.src='" + adsenseUrl + "'"));
  assert.ok(runtime.includes("adsenseScript.async=true;"));
  assert.ok(runtime.includes("adsenseScript.dataset.nexusnovaAdsense=''"));
});

test('homepage AdSense waits for settled LCP, load, and idle with a bounded fallback', () => {
  assert.ok(runtime.includes("const isHomepage=location.pathname==='/'||/\\/index\\.html$/.test(location.pathname);"));
  assert.ok(runtime.includes('const scheduleAfterLargestContentfulPaint=(task,options={})=>{'));
  assert.ok(runtime.includes("observer.observe({type:'largest-contentful-paint',buffered:true})"));
  assert.ok(runtime.includes('quietTimer=window.setTimeout(()=>{lcpSettled=true;scheduleIfReady();},1200)'));
  assert.ok(runtime.includes("window.addEventListener('load',()=>{pageLoaded=true;scheduleIfReady();},{once:true})"));
  assert.ok(runtime.includes('scheduleAfterLargestContentfulPaint(insertAdsenseScript,{delay:2500,fallbackDelay:7000,idleTimeout:1500})'));
  assert.ok(runtime.includes("window.requestIdleCallback(task,{timeout:idleTimeout})"));
  assert.ok(runtime.includes('window.setTimeout(()=>{lcpSettled=true;scheduleIfReady();},fallbackDelay)'));
  assert.ok(!runtime.includes("window.requestIdleCallback(insertAdsenseScript,{timeout:4000})"));
  assert.ok(runtime.includes("else{\n    insertAdsenseScript();\n  }"), 'non-homepage ad behavior remains unchanged');
});

test('live Performance 100 Gate validates the LCP-aware AdSense scheduler, not the old idle-only path', () => {
  const gate = fs.readFileSync(path.join(root, '.github/workflows/live-performance-100.yml'), 'utf8');
  assert.ok(gate.includes('const scheduleAfterLargestContentfulPaint=(task,options={})=>'));
  assert.ok(gate.includes('scheduleAfterLargestContentfulPaint(insertAdsenseScript,{delay:2500,fallbackDelay:7000,idleTimeout:1500})'));
  assert.ok(!gate.includes('window.requestIdleCallback(insertAdsenseScript,{timeout:4000})'));
});

test('GA4 measurement ID and consent updater remain untouched', () => {
  assert.ok(runtime.includes("const measurementId='" + measurementId + "';"));
  assert.ok(runtime.includes('window.__nexusnovaLoadAnalytics=choice=>{'));
  assert.ok(homepage.includes('nn-home-consent-critical-css'));
  assert.ok(homepage.includes('data-consent-allow'));
  assert.ok(homepage.includes('data-consent-basic'));
  assert.ok(homepage.includes('data-consent-off'));
});

test('homepage GA4 config is queued, then the analytics runtime loads after LCP and idle', () => {
  assert.ok(runtime.includes("const initializeGa4=()=>{"));
  assert.ok(runtime.includes("window.gtag('js',new Date());"));
  assert.ok(runtime.includes("window.gtag('config',measurementId,{"));
  assert.ok(runtime.includes('scheduleAfterLargestContentfulPaint(initializeGa4,{delay:500,fallbackDelay:4000,idleTimeout:1500})'));
  assert.ok(runtime.indexOf("window.gtag('config',measurementId,{") < runtime.indexOf("analyticsScript.src='https://www.googletagmanager.com/gtag/js?id='"), 'config must queue before async script injection');
  assert.ok(runtime.includes("if(isProductionAnalyticsHost&&isHomepage){"), 'only the homepage defers GA4');
  assert.ok(runtime.includes('analyticsScript.dataset.nexusnovaGa4='), 'the singleton marker remains on the injected runtime');
  assert.ok(runtime.includes('ads_data_redaction:true'), 'measurement privacy settings remain enabled');
});

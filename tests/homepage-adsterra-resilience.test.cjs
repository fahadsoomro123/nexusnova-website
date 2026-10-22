'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function getAdsterraLoader() {
  const start = homepage.indexOf('<script id="nn-adsterra-auto-loader">');
  const close = homepage.indexOf('</script>', start);
  assert.ok(start >= 0 && close > start, 'homepage Adsterra loader must exist');
  return homepage.slice(start, close);
}

test('Adsterra preserves GPC privacy opt-out and does not change the publisher placement', () => {
  const loader = getAdsterraLoader();
  assert.ok(homepage.includes('data-nn-adsterra-placement'));
  assert.ok(homepage.includes('container-b7cb02fa163a7585244e7c2876553cea'));
  assert.ok(loader.includes('window.navigator?.globalPrivacyControl === true'));
  assert.ok(loader.includes('Ad loading is disabled because your browser sent a Global Privacy Control signal.'));
  assert.ok(loader.includes('https://pl31802817.profitableratecpmnetwork.com/b7cb02fa163a7585244e7c2876553cea/invoke.js'));
});

test('Adsterra loads near the placement during idle time instead of starting with initial HTML parse', () => {
  const loader = getAdsterraLoader();
  assert.ok(loader.includes("typeof window.IntersectionObserver === 'function'"));
  assert.ok(loader.includes("rootMargin: '600px 0px', threshold: 0.01"));
  assert.ok(loader.includes('observer.observe(placement)'));
  assert.ok(loader.includes('observer.disconnect()'));
  assert.ok(loader.includes("window.requestIdleCallback(loadAdsterra, { timeout: 1500 })"));
  assert.ok(loader.includes("window.addEventListener('load', scheduleAdLoad, { once: true })"));
  assert.ok(!loader.includes('loadAdsterra();\n    })();'), 'no direct initial-load ad request is permitted');
});

test('Adsterra network failures receive two bounded retries and a graceful terminal state', () => {
  const loader = getAdsterraLoader();
  assert.ok(loader.includes('const maxAttempts = 3;'));
  assert.ok(loader.includes("script.addEventListener('error', () => {"));
  assert.ok(loader.includes('script.remove()'));
  assert.ok(loader.includes('attempts < maxAttempts'));
  assert.ok(loader.includes('attempts * 1000'));
  assert.ok(loader.includes("window.__nexusnovaAdsterraState = 'retrying'"));
  assert.ok(loader.includes("window.__nexusnovaAdsterraState = 'failed'"));
  assert.ok(loader.includes('The external ad network is unavailable right now. The website tools remain available.'));
  assert.ok(!loader.includes('Please refresh later.'));
});

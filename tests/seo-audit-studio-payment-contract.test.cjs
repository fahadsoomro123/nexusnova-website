'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'seo-audit-studio.html'), 'utf8');

test('SEO Audit Studio card and crypto checkout controls default to disabled', () => {
  const cardButton = html.match(/<button\b[^>]*\bid="safepayCheckoutBtn"[^>]*>/i)?.[0] || '';
  const cryptoButton = html.match(/<button\b[^>]*\bid="prepareCryptoBtn"[^>]*>/i)?.[0] || '';

  assert.ok(cardButton, 'card checkout button must exist');
  assert.ok(cryptoButton, 'crypto checkout button must exist');
  assert.match(cardButton, /\bdisabled\b/, 'card checkout must not be initially clickable');
  assert.match(cryptoButton, /\bdisabled\b/, 'crypto checkout must not be initially clickable');
  assert.match(html, /if\(!state\.config\)\s*\{\s*button\.disabled=true;\s*return false;\s*\}/,
    'crypto UI stays closed until server payment config loads');
  assert.match(html, /Secure payment settings could not be loaded\. Payment remains disabled/,
    'API config failure must leave payment actions disabled');
});

test('card checkout is only enabled for a configured Safepay provider or explicitly enabled local simulator', () => {
  assert.match(html,
    /const cardCheckoutReady=\(state\.config\.provider==='safepay' && state\.config\.safepayConfigured\) \|\| \(state\.config\.provider==='mock' && state\.config\.devSimulatorEnabled\);/);
  assert.match(html, /\$\('safepayCheckoutBtn'\)\.disabled=!cardCheckoutReady;/);
  assert.doesNotMatch(html, /safepayConfigured\s*\|\|\s*true/,
    'an unconfigured provider must never be treated as ready');
});

test('crypto checkout readiness is bound to the selected network and verified capability', () => {
  assert.match(html, /const network=\$\('cryptoNetwork'\)\.value;/,
    'current network selection must be read when deciding readiness');
  assert.match(html,
    /const direct=network==='TRC20'\s*\?\s*Boolean\(config\.walletAddresses\?\.TRC20 && config\.cryptoCapabilities\?\.TRC20\)\s*:\s*Boolean\(config\.walletAddresses\?\.ERC20 && config\.cryptoCapabilities\?\.ERC20\);/);
  assert.match(html, /const available=hosted \|\| direct \|\| simulator;/);
  assert.match(html, /\$\('cryptoNetwork'\)\.addEventListener\('change',updateCryptoCheckoutAvailability\)/,
    'changing network must recalculate whether checkout is available');
  assert.match(html, /This network has no verified receiving address and active chain verifier\. Do not transfer funds\./);
});

test('cross-origin browser requests are restricted to the dedicated API and include session credentials', () => {
  assert.match(html, /const API_BASE_URL = 'https:\/\/audit-api\.nexusnovatools\.com';/);
  assert.match(html, /endpoint\.origin !== API_BASE_ORIGIN \|\| !endpoint\.pathname\.startsWith\('\/api\/'\)/,
    'the browser helper must refuse cross-origin or non-API paths');
  assert.match(html, /credentials: 'include'/,
    'browser session cookie must accompany API requests');
  assert.doesNotMatch(html, /fetch\(\s*['"]\/api\//,
    'no payment/audit API should silently use the static page origin');
});

test('provider return only unlocks after authenticated backend order status reports paid', () => {
  assert.match(html, /if\(response\.ok && payload\.status==='paid'\)\s*\{\s*state\.auditId=payload\.auditId;\s*await unlockReport\(payload\.auditId\);/);
  assert.match(html, /if\(query\.get\('payment'\)==='return' && orderId\)\s*\{\s*[\s\S]*?await pollOrder\(orderId\)/);
  assert.match(html, /Payment is still pending\. The server will unlock the report only after Safepay verifies payment through its Reporter API or a signed webhook/);
});

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

test('public card checkout stays disabled while Safepay is only configured for sandbox', () => {
  assert.match(html,
    /const cardCheckoutReady=productionMode && state\.config\.livePaymentsEnabled===true && state\.config\.provider==='safepay' && state\.config\.safepayConfigured===true;/);
  assert.match(html, /\$\('safepayCheckoutBtn'\)\.disabled=!cardCheckoutReady;/);
  assert.match(html, /productionMode\?'Continue to secure Safepay checkout':'Safepay checkout pending production onboarding'/);
  assert.doesNotMatch(html, /safepayConfigured\s*\|\|\s*true/,
    'an unconfigured provider must never be treated as ready');
});

test('crypto option remains visible but checkout needs authorized production configuration', () => {
  assert.match(html, /class="crypto-payment-panel"/);
  assert.match(html, /if\(config\.environment!=='production' \|\| config\.livePaymentsEnabled!==true\) \{/);
  assert.match(html, /Crypto checkout waiting for production setup/);
  assert.match(html, /const network=\$\('cryptoNetwork'\)\.value;/,
    'current network selection must be read when deciding readiness');
  assert.match(html,
    /const direct=network==='TRC20'\s*\?\s*Boolean\(config\.walletAddresses\?\.TRC20 && config\.cryptoCapabilities\?\.TRC20\)\s*:\s*Boolean\(config\.walletAddresses\?\.ERC20 && config\.cryptoCapabilities\?\.ERC20\);/);
  assert.match(html, /const available=hosted \|\| direct \|\| simulator;/);
  assert.match(html, /\$\('cryptoNetwork'\)\.addEventListener\('change',updateCryptoCheckoutAvailability\)/,
    'changing network must recalculate whether checkout is available');
  assert.match(html, /This network has no verified receiving address and active chain verifier\. Do not transfer funds\./);
});

test('cross-origin requests use a dedicated isolated Worker and session-scoped bearer authentication', () => {
  assert.match(html, /const API_BASE_URL = 'https:\/\/nexusnova-audit-studio\.fahadsoomro123\.workers\.dev';/);
  assert.match(html, /endpoint\.origin !== API_BASE_ORIGIN \|\| !endpoint\.pathname\.startsWith\('\/api\/'\)/,
    'the browser helper must refuse cross-origin or non-API paths');
  assert.match(html, /headers\.set\('Authorization', 'Bearer ' \+ await getAuditSessionToken\(\)\)/,
    'sensitive API requests must use their own bearer session rather than third-party cookies');
  assert.match(html, /credentials: 'omit'/, 'cross-site cookies are not used');
  assert.match(html, /AUDIT_SESSION_KEY = 'nexusnova_audit_session_v1'/,
    'the product session token has its own sessionStorage key');
  assert.doesNotMatch(html, /audit-api\.nexusnovatools\.com/,
    'the old Node/VPS backend must not be called by this product');
  assert.doesNotMatch(html, /nexusnova-telegram-bot\.fahadsoomro123\.workers\.dev/,
    'the existing auth/HumanProof-related Worker must not be used as the audit API');
  assert.doesNotMatch(html, /fetch\(\s*['"]\/api\//,
    'no payment/audit API should silently use the static page origin');
});

test('provider return only unlocks after authenticated backend order status reports paid', () => {
  assert.match(html, /if\(response\.ok && payload\.status==='paid'\)\s*\{\s*state\.auditId=payload\.auditId;\s*await unlockReport\(payload\.auditId\);/);
  assert.match(html, /if\(query\.get\('payment'\)==='return' && orderId\)\s*\{\s*[\s\S]*?await pollOrder\(orderId\)/);
  assert.match(html, /Payment is still pending\. The server will unlock the report only after provider-side verification through the Safepay Reporter API or a signed Safepay\/NOWPayments webhook/);
});

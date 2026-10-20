'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'seo-audit-studio.html'), 'utf8');
const sandboxHtml = fs.readFileSync(path.join(root, 'seo-audit-studio-sandbox.html'), 'utf8');

test('SEO Audit Studio card and crypto checkout controls default to disabled', () => {
  const cardButton = html.match(/<button\b[^>]*\bid="safepayCheckoutBtn"[^>]*>/i)?.[0] || '';
  const cryptoButton = html.match(/<button\b[^>]*\bid="prepareCryptoBtn"[^>]*>/i)?.[0] || '';

  assert.ok(cardButton, 'card checkout button must exist');
  assert.ok(cryptoButton, 'crypto checkout button must exist');
  assert.match(cardButton, /\bdisabled\b/, 'card checkout must not be initially clickable');
  assert.match(cryptoButton, /\bdisabled\b/, 'crypto checkout must not be initially clickable');
  assert.match(html, /if\(!state\.config\)\s*\{\s*button\.disabled=true;\s*return false;\s*\}/,
    'crypto UI stays closed until server payment config loads');
  assert.match(html, /Payment settings could not be fetched\. No payment was started/);
  assert.match(html, /id="retryPaymentSettingsBtn"[^>]*hidden/);
  assert.match(html, /\$\('retryPaymentSettingsBtn'\)\?\.addEventListener\('click',\(\)=>initializePayments\(\)\)/,
    'the user can retry settings without reloading the page');
});

test('isolated sandbox page can simulate card and crypto report unlocks without live payment providers', () => {
  assert.ok(sandboxHtml.includes('noindex,nofollow,noarchive'));
  assert.ok(sandboxHtml.includes('SANDBOX TEST PAGE') && sandboxHtml.includes('NO REAL PAYMENTS'));
  assert.ok(sandboxHtml.includes("const API_BASE_URL = 'https://nexusnova-audit-studio-simulator.fahadsoomro123.workers.dev';"));
  assert.ok(!sandboxHtml.includes('https://nexusnova-audit-studio.fahadsoomro123.workers.dev'), 'test page must not share the live database');
  assert.ok(sandboxHtml.includes("const cardSimulatorReady=!productionMode && state.config.provider==='mock' && state.config.devSimulatorEnabled===true;"));
  assert.ok(sandboxHtml.includes("await apiPost('/api/dev/card/approve',{orderId:state.cardOrderId});"));
  assert.ok(sandboxHtml.includes("if(config.devSimulatorEnabled===true && config.environment!=='production' && config.provider==='mock')"));
  assert.ok(sandboxHtml.includes("await apiPost('/api/dev/crypto/approve',{orderId:state.cryptoOrderId,txid:$('cryptoTxid').value.trim()});"));
  assert.ok(sandboxHtml.includes("$('cryptoSandboxTest').hidden=!Boolean(payload.devSimulatorEnabled)"));
  assert.ok(sandboxHtml.includes('Sandbox-only page blocked a real Safepay redirect'));
  assert.ok(sandboxHtml.includes('Sandbox-only page blocked a real NOWPayments redirect'));
  assert.ok(sandboxHtml.includes('LOCAL SIMULATOR ENABLED'));
  assert.ok(!html.includes('const cardSimulatorReady'), 'public production page must keep mock card approval disabled');
});

test('public card checkout stays disabled while Safepay is only configured for sandbox', () => {
  assert.match(html,
    /const cardCheckoutReady=productionMode && state\.config\.livePaymentsEnabled===true && state\.config\.provider==='safepay' && state\.config\.safepayConfigured===true;/);
  assert.match(html, /\$\('safepayCheckoutBtn'\)\.disabled=!cardCheckoutReady;/);
  assert.match(html, /productionMode\?'Continue to secure Safepay checkout':'Safepay checkout pending production onboarding'/);
  assert.doesNotMatch(html, /safepayConfigured\s*\|\|\s*true/,
    'an unconfigured provider must never be treated as ready');
  assert.match(html, /const sandboxOnly=!productionMode;/,
    'sandbox mode is detected separately from a closed production payment gate');
  assert.match(html, /const liveGateClosed=productionMode && state\.config\.livePaymentsEnabled!==true;/,
    'a production gate closure must not be mislabeled as sandbox mode');
  assert.match(html, /Production checkout is locked until live merchant onboarding and payment verification are confirmed\./,
    'production setup explains why checkout is unavailable');
  assert.match(html, /setStatus\(\$\('cardPaymentStatus'\),message,\(sandboxOnly\|\|liveGateClosed\)\?'':'error'\);/,
    'intentional sandbox and fail-closed production states use a neutral status style');
});

test('crypto option remains visible but checkout needs authorized production configuration', () => {
  assert.match(html, /class="crypto-payment-panel"/);
  assert.ok(html.includes("if(config.environment!=='production'||config.livePaymentsEnabled!==true){"));
  assert.ok(html.includes('Crypto checkout waiting for production setup'));
  assert.ok(html.includes("const network=$('cryptoNetwork').value;"));
  assert.ok(html.includes("const providerReady=config.cryptoProvider==='nowpayments'&&config.nowPaymentsConfigured===true&&(network==='TRC20'||network==='ERC20');"));
  assert.ok(html.includes('const available=providerReady||direct;'));
  assert.ok(html.includes('Prepare verified USDT transfer'));
  assert.ok(html.includes('This network is not configured for server-verified checkout. Do not transfer funds.'));
  assert.ok(html.includes("$('cryptoNetwork').addEventListener('change',updateCryptoCheckoutAvailability)"));
});

test('NOWPayments UI validates the selected USDT network and exact payment details before displaying a transfer', () => {
  assert.ok(html.includes("const selectedNetwork=$('cryptoNetwork').value;"));
  assert.ok(html.includes("const expectedCurrency=selectedNetwork==='TRC20'?'usdttrc20':selectedNetwork==='ERC20'?'usdterc20':'';"));
  assert.ok(html.includes("String(payload.payCurrency||'').toLowerCase()!==expectedCurrency"));
  assert.ok(html.includes("String(payload.payAmount)+' '+String(payload.payCurrency).toUpperCase()"));
  assert.ok(html.includes("$('cryptoWalletAddress').textContent=payload.walletAddress;"));
  assert.ok(html.includes("apiFetch('/api/orders/'+encodeURIComponent(state.cryptoOrderId)+'/status'"));
  assert.ok(!html.includes("apiPost('/api/payments/crypto/verify'"));
  assert.ok(!html.includes('window.location.assign(checkout.href)'));
  assert.ok(html.includes('valid signed IPN matching the order, amount and selected network'));
  assert.ok(html.includes("payload.status==='paid'"));
});

test('PageSpeed diagnostics describe the Cloudflare secret, hide setup hint when configured, and never instruct .env editing', () => {
  for (const page of [html, sandboxHtml]) {
    assert.ok(page.includes('PAGESPEED_API_KEY as a Cloudflare Worker secret'));
    assert.ok(!page.includes('server-side .env file'));
    assert.ok(page.includes('pageSpeedSetupNote.hidden=src.pageSpeedConfigured===true;'));
    assert.ok(page.includes('Google PageSpeed quota was exceeded on the keyless shared quota'));
    assert.ok(page.includes('Google PageSpeed quota was exceeded for the configured project'));
  }
});

test('cached PageSpeed scores are visibly labelled and stale fallback discloses age', () => {
  for (const page of [html, sandboxHtml]) {
    assert.ok(page.includes("provider==='google-pagespeed-cache'?'Google PageSpeed Insights (cached)'"));
    assert.ok(page.includes('data?.cacheStale'));
    assert.ok(page.includes('Google PageSpeed measurement from '));
    assert.ok(page.includes('six-hour cache; no new result was fabricated'));
  }
});

test('payment settings cannot stick in loading state and the reviewed-check count uses scoredCount', () => {
  assert.match(html, /apiFetch\('\/api\/config',\{method:'POST'/,
    'use the CORS-simple POST fallback instead of the failing browser GET request');
  assert.match(html, /AbortSignal\.timeout\(8000\)/,
    'configuration fetch must fail closed instead of loading indefinitely');
  assert.doesNotMatch(html, /Loading secure checkout settings/);
  assert.match(html, /Checking payment configuration\.\.\./);
  assert.match(html, /Checking crypto availability\.\.\./);
  assert.match(html, /el\.checks\.textContent=report\.checkCount \?\? report\.scoredCount \?\? report\.checks\?\.length \?\? 0;/,
    'preview does not include a full checks array, so display its measured scoredCount');
  const initStart = html.indexOf('async function initializePayments() {');
  const initEnd = html.indexOf('async function handlePaymentReturn()', initStart);
  assert.ok(initStart >= 0 && initEnd > initStart, 'payment configuration initializer must be present');
  assert.doesNotMatch(html.slice(initStart, initEnd), /openPaywall|beginCardPayment|prepareCryptoPayment/,
    'loading payment settings never opens the modal or creates a payment');
});

test('startup tolerates the optional sample-report button being absent', () => {
  assert.match(html, /\$\('sampleTopBtn'\)\?\.addEventListener\('click',loadSample\);/,
    'an omitted optional sample button must not crash payment settings or audit initialization');
  assert.ok(html.includes('initializePayments().then(()=>'), 'payment setup still initializes after event handlers');
});

test('footerYear cannot crash startup when the footer year element is omitted', () => {
  assert.match(html, /const footerYear=\$\('footerYear'\); if\(footerYear\) footerYear\.textContent=new Date\(\)\.getFullYear\(\);/,
    'the footer year is an optional presentation detail and must not halt audit/payment initialization');
});

test('transient browser transport failures retry only safe audit/session/config requests', () => {
  assert.ok(html.includes('async function fetchWithTransportRetry(url, init = {}, allowTransportRetry = false)'));
  assert.ok(html.includes('if (!allowTransportRetry || !(error instanceof TypeError)) throw error;'));
  assert.ok(html.includes('await new Promise(resolve => window.setTimeout(resolve, 300));'));
  assert.ok(html.includes("const retryableTransport = endpoint.pathname === '/api/config'"));
  assert.ok(html.includes("endpoint.pathname === '/api/audits' || endpoint.pathname === '/api/audits/sample'"));
  assert.ok(html.includes('fetchWithTransportRetry(endpoint.href, init, retryableTransport)'));
  assert.ok(html.includes("fetchWithTransportRetry(API_BASE_URL + '/api/session'"));
  const whitelistStart = html.indexOf('const retryableTransport =');
  const whitelistEnd = html.indexOf('const response = await fetchWithTransportRetry(endpoint.href, init, retryableTransport);', whitelistStart);
  assert.ok(whitelistStart >= 0 && whitelistEnd > whitelistStart);
  assert.doesNotMatch(html.slice(whitelistStart, whitelistEnd), /payments\/(?:card-session|crypto\/create)/,
    'payment and invoice creation routes must never be automatically retried');
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

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Telegram SDK and NexusNova bridge load before page-specific app code', () => {
  const index = read('index.html');
  const indexSdk = index.indexOf('telegram-web-app.js?63');
  const indexBridge = index.indexOf('assets/js/telegram-webapp.js');
  const indexMain = index.indexOf('assets/js/main.js');
  assert.ok(indexSdk >= 0, 'index.html is missing the official Telegram SDK');
  assert.ok(indexBridge > indexSdk, 'index.html must load the bridge after the official SDK');
  assert.ok(indexMain > indexBridge, 'index.html must load site code after the Telegram bridge');

  for (const file of ['register.html', 'account.html']) {
    const html = read(file);
    const sdk = html.indexOf('telegram-web-app.js?63');
    const bridge = html.indexOf('assets/js/telegram-webapp.js');
    const shell = html.indexOf('assets/js/account-shell.js');
    assert.ok(sdk >= 0, `${file} is missing the official Telegram SDK`);
    assert.ok(bridge > sdk, `${file} must load the bridge after the official SDK`);
    assert.ok(shell > bridge, `${file} must load the lightweight shell after the Telegram bridge`);
  }
});

test('all Telegram entry pages use the exact same bridge cache version', () => {
  const versions = ['index.html', 'register.html', 'account.html'].map(file => {
    const match = read(file).match(/assets\/js\/telegram-webapp\.js\?v=([0-9-]+)/);
    assert.ok(match, `${file} is missing a versioned Telegram bridge`);
    return match[1];
  });
  assert.deepEqual(new Set(versions).size, 1);
  assert.equal(versions[0], '20260826-5');
});

test('account pages avoid the global heavy bundle and NOVA assistant injection', () => {
  for (const file of ['register.html', 'account.html']) {
    const html = read(file);
    assert.doesNotMatch(html, /assets\/js\/main\.js/);
    assert.match(html, /assets\/js\/account-shell\.js/);
  }
  const shell = read('assets/js/account-shell.js');
  assert.doesNotMatch(shell, /assistant|googletagmanager|gtag|IntersectionObserver/);
  assert.match(shell, /data-menu-btn/);
  assert.match(shell, /data-year/);
});

test('account pages use server verification and Firebase linking callables', () => {
  const register = read('assets/js/register.js');
  const dashboard = read('assets/js/account-dashboard.js');
  for (const source of [register, dashboard]) {
    assert.match(source, /telegramSessionCall/);
    assert.match(source, /linkTelegramAccount/);
    assert.doesNotMatch(source, /firebase-functions\.js|httpsCallable/);
  }
  const api = read('assets/js/telegram-account-api.js');
  assert.match(api, /\/api\/telegram\/session/);
  assert.match(api, /\/api\/telegram\/link/);
  assert.match(api, /Authorization = `Bearer \$\{idToken\}`/);
  assert.match(register, /signInWithCustomToken/);
  assert.match(dashboard, /signInWithCustomToken/);
  assert.match(read('register.html'), /data-telegram-panel/);
  assert.match(read('account.html'), /data-telegram-link/);
});

test('linked account display can use fresh Telegram photo only when identity IDs match', () => {
  const dashboard = read('assets/js/account-dashboard.js');
  assert.match(dashboard, /function telegramDisplayUser\(serverUser\)/);
  assert.match(dashboard, /String\(local\.id\|\|''\)!==String\(serverUser\.id\|\|''\)/);
  assert.match(dashboard, /photoUrl:local\.photoUrl\|\|serverUser\.photoUrl\|\|''/);
  assert.match(dashboard, /paintTelegram\(telegramDisplayUser\(linkedTelegram\)/);
});

test('Telegram avatar is fallback-first and never guesses a username image URL', () => {
  const dashboard = read('assets/js/account-dashboard.js');
  assert.match(dashboard, /telegramPhoto\.src=fallback/);
  assert.match(dashboard, /const probe=new Image\(\)/);
  assert.match(dashboard, /probe\.src=photoUrl/);
  assert.match(dashboard, /probe\.naturalWidth>0&&probe\.naturalHeight>0/);
  assert.doesNotMatch(dashboard, /telegramPublicAvatarUrl|t\.me\/i\/userpic\/320\/\$\{/);
  assert.match(read('account.html'), /account-dashboard\.js\?v=20260826-5/);
});

test('Telegram backend requests cannot hang the account page indefinitely', () => {
  const api = read('assets/js/telegram-account-api.js');
  assert.match(api, /TELEGRAM_REQUEST_TIMEOUT_MS = 10000/);
  assert.match(api, /new AbortController\(\)/);
  assert.match(api, /signal: controller\.signal/);
  assert.match(api, /controller\.abort\(\)/);
  assert.match(api, /clearTimeout\(timeout\)/);
});

test('Telegram register gateway bypasses the heavy manual form for a fresh Mini App launch', () => {
  const registerPage = read('register.html');
  assert.match(registerPage, /bridge\?\.isAvailable && !fallback/);
  assert.match(registerPage, /location\.replace\('account\.html\?telegram=1'\)/);
  assert.match(registerPage, /params\.has\('reason'\) \|\| params\.has\('signedout'\)/);
  assert.match(registerPage, /data-telegram-auto-login-error/);
});

test('launch-scoped Telegram auto-login guard does not permanently suppress a future launch', () => {
  const register = read('assets/js/register.js');
  const dashboard = read('assets/js/account-dashboard.js');
  const bridge = read('assets/js/telegram-webapp.js');
  assert.match(bridge, /getAuthDate/);
  assert.match(register, /telegramLaunchKey/);
  assert.match(register, /stored === '1'/);
  assert.match(dashboard, /telegramAutoLoginSkippedForCurrentLaunch/);
  assert.match(dashboard, /markTelegramAutoLoginSkippedForCurrentLaunch/);
});

test('prototype localStorage identity persistence is removed', () => {
  const bridge = read('assets/js/telegram-webapp.js');
  assert.doesNotMatch(bridge, /telegramUser|localStorage/);
  assert.doesNotMatch(bridge, /console\.log/);
});

test('bot worker opens Web Apps privately and keeps group URL fallback', () => {
  const worker = read('cloudflare/telegram-bot/worker.js');
  assert.match(worker, /setChatMenuButton/);
  assert.match(worker, /web_app/);
  assert.match(worker, /privateChat \? \{ text, web_app: \{ url \} \} : \{ text, url \}/);
  assert.match(worker, /command === "\/news"/);
  assert.match(worker, /url\.pathname === "\/status"/);
  assert.match(worker, /getWebhookInfo/);
  assert.match(worker, /getMyCommands/);
  assert.match(worker, /secret_token/);
  assert.match(worker, /X-Telegram-Bot-Api-Secret-Token/);
  assert.match(worker, /if \(!response\.ok \|\| !result\.ok\)/);
});

test('privacy and deletion pages disclose linked Telegram data', () => {
  assert.match(read('privacy.html'), /Telegram Mini App/);
  assert.match(read('privacy.html'), /not trusted as authentication/);
  assert.match(read('account-deletion.html'), /linked Telegram identity mapping/);
});

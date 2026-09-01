'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Instagram Business Login starts from a server-issued authorization URL', () => {
  const ui = read('assets/js/instagram-auth-ui.js');
  const callback = read('instagram-callback.html');
  const wrapper = read('cloudflare/telegram-bot/worker-instagram-entry.js');
  const oauth = read('cloudflare/telegram-bot/instagram-oauth-state.js');
  const shell = read('assets/js/account-shell.js');

  assert.match(ui, /\/api\/instagram\/start/);
  assert.match(ui, /location\.assign\(authUrl\)/);
  assert.match(wrapper, /\/api\/instagram\/start/);
  assert.match(oauth, /INSTAGRAM_APP_ID = ['"]1564402658290447['"]/);
  assert.match(oauth, /https:\/\/www\.instagram\.com\/oauth\/authorize/);
  assert.match(oauth, /instagram_business_basic/);
  assert.match(oauth, /https:\/\/nexusnovatools\.com\/instagram-callback\.html/);
  assert.match(callback, /body: JSON\.stringify\(\{ code, state, redirectUri: REDIRECT_URI \}\)/);
  assert.match(shell, /instagram-auth-ui\.js\?v=20260901-4/);
});

test('Instagram OAuth state is HMAC signed and verified server-side instead of browser storage', () => {
  const ui = read('assets/js/instagram-auth-ui.js');
  const callback = read('instagram-callback.html');
  const oauth = read('cloudflare/telegram-bot/instagram-oauth-state.js');

  assert.match(oauth, /crypto\.subtle\.sign\('HMAC'/);
  assert.match(oauth, /crypto\.subtle\.verify/);
  assert.match(oauth, /payload\.uid !== uid/);
  assert.match(oauth, /STATE_TTL_SECONDS/);
  assert.match(oauth, /oauth-state-expired/);
  assert.doesNotMatch(ui, /sessionStorage|localStorage|STATE_COOKIE|window\.opener/);
  assert.doesNotMatch(callback, /sessionStorage|localStorage|STATE_COOKIE|window\.opener/);
});

test('Instagram authorization code is exchanged only by the Worker and no secret is exposed to browser code', () => {
  const ui = read('assets/js/instagram-auth-ui.js');
  const callback = read('instagram-callback.html');
  const backend = read('cloudflare/telegram-bot/instagram-account-v2.js');
  const oauth = read('cloudflare/telegram-bot/instagram-oauth-state.js');
  const wrapper = read('cloudflare/telegram-bot/worker-instagram-entry.js');

  assert.doesNotMatch(ui, /INSTAGRAM_APP_SECRET|client_secret|oauth\/access_token/);
  assert.doesNotMatch(callback, /INSTAGRAM_APP_SECRET|client_secret|oauth\/access_token/);
  assert.match(wrapper, /instagram-account-v2\.js/);
  assert.match(wrapper, /instagram-oauth-state\.js/);
  assert.match(oauth, /env\.INSTAGRAM_APP_SECRET/);
  assert.match(backend, /env\.INSTAGRAM_APP_SECRET/);
  assert.match(backend, /https:\/\/api\.instagram\.com\/oauth\/access_token/);
  assert.match(backend, /client_secret/);
  assert.match(backend, /https:\/\/graph\.instagram\.com/);
  assert.doesNotMatch(backend, /instagramAccessToken|accessToken:\s*fsString/);
});

test('Instagram backend accepts full service-account JSON or existing split Cloudflare secrets', () => {
  const backend = read('cloudflare/telegram-bot/instagram-account-v2.js');
  assert.match(backend, /FIREBASE_SERVICE_ACCOUNT_JSON/);
  assert.match(backend, /FIREBASE_CLIENT_EMAIL/);
  assert.match(backend, /FIREBASE_PRIVATE_KEY/);
  assert.match(backend, /normalizePrivateKey/);
  assert.match(backend, /replace\(\/\\\\n\/g, '\\n'\)/);
});

test('Instagram connected state is server verified and one-to-one without reward mutations', () => {
  const ui = read('assets/js/instagram-auth-ui.js');
  const backend = read('cloudflare/telegram-bot/instagram-account-v2.js');
  const wrapper = read('cloudflare/telegram-bot/worker-instagram-entry.js');

  assert.match(wrapper, /\/api\/instagram\/status/);
  assert.match(wrapper, /\/api\/instagram\/link/);
  assert.match(wrapper, /request\.headers\.get\('Origin'\) !== ALLOWED_ORIGIN/);
  assert.match(backend, /instagramIdentities/);
  assert.match(backend, /instagramUserLinks/);
  assert.match(backend, /users/);
  assert.match(backend, /already linked to another NexusNova account/);
  assert.match(ui, /result\?\.linked === true/);
  assert.match(ui, /state\.textContent = 'CONNECTED'/);
  assert.doesNotMatch(ui, /rewardAmount|rewardValue|increment\s*\(|miningActive|balance\s*=/);
  assert.doesNotMatch(backend, /rewardAmount|rewardValue|increment\s*\(|miningActive/);
});

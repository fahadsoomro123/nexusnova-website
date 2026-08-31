'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Instagram Business Login uses the approved app, redirect and minimal identity scope', () => {
  const ui = read('assets/js/instagram-auth-ui.js');
  const callback = read('instagram-callback.html');
  const shell = read('assets/js/account-shell.js');

  assert.match(ui, /INSTAGRAM_APP_ID = ['"]1564402658290447['"]/);
  assert.match(ui, /https:\/\/www\.instagram\.com\/oauth\/authorize/);
  assert.match(ui, /instagram_business_basic/);
  assert.match(ui, /https:\/\/nexusnovatools\.com\/instagram-callback\.html/);
  assert.match(ui, /sessionStorage\.setItem\(STATE_KEY/);
  assert.match(ui, /payload\.state !== expectedState/);
  assert.match(callback, /nexusnova-instagram-oauth/);
  assert.match(callback, /window\.opener\.postMessage\(payload, location\.origin\)/);
  assert.match(shell, /instagram-auth-ui\.js\?v=20260901-1/);
});

test('Instagram authorization code is exchanged only by the Worker and no secret is exposed to browser code', () => {
  const ui = read('assets/js/instagram-auth-ui.js');
  const backend = read('cloudflare/telegram-bot/instagram-account.js');

  assert.doesNotMatch(ui, /INSTAGRAM_APP_SECRET|client_secret|oauth\/access_token/);
  assert.match(backend, /env\.INSTAGRAM_APP_SECRET/);
  assert.match(backend, /https:\/\/api\.instagram\.com\/oauth\/access_token/);
  assert.match(backend, /client_secret/);
  assert.match(backend, /https:\/\/graph\.instagram\.com/);
  assert.match(backend, /fields', 'id,username,account_type'/);
  assert.doesNotMatch(backend, /fsString\(accessToken\)|accessToken:\s*fsString|instagramAccessToken/);
});

test('Instagram connected state is server verified and one-to-one without reward mutations', () => {
  const ui = read('assets/js/instagram-auth-ui.js');
  const backend = read('cloudflare/telegram-bot/instagram-account.js');
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

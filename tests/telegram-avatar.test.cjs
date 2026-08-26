'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Cloudflare entrypoint securely proxies the current Telegram profile photo', () => {
  const entry = read('cloudflare/telegram-bot/worker-entry.js');
  const wrangler = read('cloudflare/telegram-bot/wrangler.jsonc');

  assert.match(wrangler, /"main": "worker-entry\.js"/);
  assert.match(entry, /import worker from '\.\/worker\.js'/);
  assert.match(entry, /\/api\/telegram\/avatar/);
  assert.match(entry, /getUserProfilePhotos/);
  assert.match(entry, /getFile/);
  assert.match(entry, /data\.user\.avatarUrl/);
  assert.match(entry, /signAvatar\(env\.TELEGRAM_BOT_TOKEN/);
  assert.match(entry, /constantTimeTextEqual/);
  assert.match(entry, /X-Content-Type-Options/);
});

test('linked account refresh applies only the avatar for the same Telegram identity and retries transient failures', () => {
  const refresh = read('assets/js/telegram-avatar-refresh.js');
  const account = read('account.html');

  assert.match(account, /telegram-avatar-refresh\.js\?v=20260826-2/);
  assert.match(refresh, /telegramSessionCall/);
  assert.match(refresh, /textContent \|\| ''\)\.trim\(\)\.toUpperCase\(\) !== 'LINKED'/);
  assert.match(refresh, /String\(serverUser\.id\) !== String\(localUser\.id\)/);
  assert.match(refresh, /serverUser\?\.avatarUrl/);
  assert.match(refresh, /MAX_AVATAR_ATTEMPTS = 3/);
  assert.match(refresh, /scheduleRetry/);
  assert.match(refresh, /probeAvatar/);
  assert.doesNotMatch(refresh, /TELEGRAM_BOT_TOKEN|bot\$\{token\}/);
});

test('signed-in account becomes visible before remote profile refresh waits', () => {
  const dashboard = read('assets/js/account-dashboard.js');
  const account = read('account.html');
  const loadAccount = dashboard.indexOf('async function loadAccount(user)');
  const reveal = dashboard.indexOf('showDashboard();', loadAccount);
  const reload = dashboard.indexOf('await user.reload();', loadAccount);

  assert.ok(loadAccount >= 0, 'loadAccount should exist');
  assert.ok(reveal > loadAccount, 'dashboard reveal should be inside loadAccount');
  assert.ok(reload > reveal, 'dashboard should reveal before waiting for user.reload');
  assert.match(account, /account-dashboard\.js\?v=20260826-6/);
});

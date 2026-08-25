'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { createHmac, webcrypto } = require('node:crypto');

const source = fs.readFileSync(path.join(__dirname, '../cloudflare/telegram-bot/worker.js'), 'utf8');
const runnable = source.replace(
  'export default {',
  'globalThis.__worker = {'
) + '\nglobalThis.__hooks = { verifyTelegramInitData };';
const context = {
  crypto: webcrypto,
  fetch,
  Request,
  Response,
  Headers,
  URL,
  URLSearchParams,
  TextEncoder,
  TextDecoder,
  atob,
  btoa,
  console: { error() {} }
};
vm.runInNewContext(runnable, context, { filename: 'worker.js' });

function signedInitData(botToken, overrides = {}) {
  const params = new URLSearchParams({
    auth_date: String(overrides.authDate || Math.floor(Date.now() / 1000)),
    query_id: 'AAE-test-query',
    user: JSON.stringify({
      id: 8872961621,
      username: 'fahad_test',
      first_name: 'Fahad',
      last_name: 'Hussain',
      photo_url: 'https://t.me/i/userpic/320/test.jpg'
    })
  });
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = createHmac('sha256', secret).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

test('Worker validates signed Telegram initData and exposes safe fields', async () => {
  const token = '1234567890:test-bot-token';
  const result = await context.__hooks.verifyTelegramInitData(signedInitData(token), token);
  assert.equal(result.user.id, '8872961621');
  assert.equal(result.user.username, 'fahad_test');
  assert.equal(result.user.firstName, 'Fahad');
  assert.equal(result.user.photoUrl, 'https://t.me/i/userpic/320/test.jpg');
});

test('Worker rejects tampered, duplicated and stale Telegram initData', async () => {
  const token = '1234567890:test-bot-token';
  const valid = signedInitData(token);
  await assert.rejects(() => context.__hooks.verifyTelegramInitData(valid.replace('Fahad', 'Fake'), token));
  await assert.rejects(() => context.__hooks.verifyTelegramInitData(`${valid}&auth_date=1`, token));
  await assert.rejects(() => context.__hooks.verifyTelegramInitData(
    signedInitData(token, { authDate: Math.floor(Date.now() / 1000) - 601 }),
    token
  ));
});

test('Worker account endpoint keeps backend secrets server-side', () => {
  assert.match(source, /FIREBASE_SERVICE_ACCOUNT_JSON/);
  assert.match(source, /X-Telegram-Bot-Api-Secret-Token/);
  assert.match(source, /accounts:lookup\?key=/);
  assert.match(source, /documents:beginTransaction/);
  assert.match(source, /documents:commit/);
  assert.doesNotMatch(source, /BEGIN PRIVATE KEY-----[A-Za-z0-9+/]/);
  const gitignore = fs.readFileSync(path.join(__dirname, '../.gitignore'), 'utf8');
  assert.match(gitignore, /firebase-adminsdk/);
  assert.match(gitignore, /service-account/);
});

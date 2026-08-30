'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('account eligibility is derived from authenticated Firebase account state on the Worker', () => {
  const eligibility = read('cloudflare/telegram-bot/account-eligibility.js');
  assert.match(eligibility, /accounts:lookup/);
  assert.match(eligibility, /Authorization/);
  assert.match(eligibility, /payload\.aud !== FIREBASE_PROJECT_ID/);
  assert.match(eligibility, /payload\.iss !== `https:\/\/securetoken\.google\.com\/\$\{FIREBASE_PROJECT_ID\}`/);
  assert.match(eligibility, /record\.emailVerified === true/);
  assert.match(eligibility, /disposableEmailRisk\(account\.email\)/);
  assert.match(eligibility, /eligibleForValueActions = emailVerified && !disposable/);
  assert.doesNotMatch(eligibility, /balance\s*:|increment|rewardAmount|rewardValue/i);
});

test('Worker exposes eligibility only through allowed-origin authenticated API route', () => {
  const entry = read('cloudflare/telegram-bot/worker-entry.js');
  assert.match(entry, /ACCOUNT_ELIGIBILITY_PATH = ['"]\/api\/account\/eligibility['"]/);
  assert.match(entry, /assertAuthOrigin\(request\)/);
  assert.match(entry, /accountEligibilityRequest\(request, env\)/);
  assert.match(entry, /url\.pathname\.startsWith\(['"]\/api\/account\/['"]\)/);
});

test('shared household Wi-Fi observation alone never blocks value eligibility', () => {
  const abuse = read('cloudflare/telegram-bot/auth-abuse.js');
  assert.match(abuse, /Shared household\/public Wi-Fi is normal/);
  assert.match(abuse, /reviewRequired:\s*false/);
  assert.match(abuse, /sharedNetworkPatternObserved/);
  assert.match(abuse, /shared-network-pattern-observed-nonblocking/);
  assert.doesNotMatch(abuse, /reviewRequired\s*=\s*isNewAccount\s*&&\s*accountHashes\.length/);
});

test('dashboard guard uses bearer token and blocks value actions when eligibility is not verified', () => {
  const shell = read('assets/js/account-shell.js');
  const ui = read('assets/js/account-eligibility-ui.js');
  assert.match(shell, /account-eligibility-ui\.js/);
  assert.match(ui, /user\.getIdToken\(true\)/);
  assert.match(ui, /Authorization: `Bearer \$\{idToken\}`/);
  assert.match(ui, /eligibleForValueActions === true/);
  assert.match(ui, /\[data-value-action\]/);
  assert.match(ui, /control\.disabled = !eligible/);
  assert.doesNotMatch(ui, /localStorage|sessionStorage/);
});

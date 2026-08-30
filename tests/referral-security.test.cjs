'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('registration delegates referral attribution to authenticated Worker API', () => {
  const register = read('assets/js/register.js');
  assert.match(register, /attachReferralCall/);
  assert.match(register, /user\.getIdToken\(true\)/);
  assert.doesNotMatch(register, /doc\(db,\s*['"]referrals['"]/);
  assert.doesNotMatch(register, /doc\(db,\s*['"]referralCodes['"]/);
});

test('referral client sends Firebase bearer token for attach and personal-code requests', () => {
  const api = read('assets/js/referral-account-api.js');
  assert.match(api, /\/api\/referral\/attach/);
  assert.match(api, /Authorization: `Bearer \$\{idToken\}`/);
  assert.match(api, /referralRequest\(\{ code \}, idToken\)/);
  assert.match(api, /referralRequest\(\{ action: ['"]code['"] \}, idToken\)/);
  assert.doesNotMatch(api, /balance|reward|amount/i);
});

test('Worker referral endpoint enforces transaction, self-referral and pending-only attribution', () => {
  const entry = read('cloudflare/telegram-bot/worker-entry.js');
  const referral = read('cloudflare/telegram-bot/referral-api.js');
  assert.match(entry, /REFERRAL_ATTACH_PATH = ['"]\/api\/referral\/attach['"]/);
  assert.match(entry, /attachReferralRequest/);
  assert.match(referral, /verifyFirebaseIdToken/);
  assert.match(referral, /beginTransaction/);
  assert.match(referral, /batchGet/);
  assert.match(referral, /referrerUid === user\.uid/);
  assert.match(referral, /referral-already-attached/);
  assert.match(referral, /status: fsString\(['"]pending['"]\)/);
  assert.doesNotMatch(referral, /balance\s*:/i);
  assert.doesNotMatch(referral, /rewardAmount|rewardValue|increment/i);
});

test('personal referral code is server-created, collision-checked and bound to one owner', () => {
  const referral = read('cloudflare/telegram-bot/referral-api.js');
  const ui = read('assets/js/referral-code-ui.js');
  const shell = read('assets/js/account-shell.js');

  assert.match(referral, /action \|\| ['"]['"]\)\.trim\(\)\.toLowerCase\(\) === ['"]code['"]/);
  assert.match(referral, /crypto\.getRandomValues/);
  assert.match(referral, /REFERRAL_CODE_ATTEMPTS = 8/);
  assert.match(referral, /documentName\(['"]referralCodes['"], code\)/);
  assert.match(referral, /ownerUid: fsString\(user\.uid\)/);
  assert.match(referral, /ownReferralCode: fsString\(selected\)/);
  assert.match(referral, /status: fsString\(['"]active['"]\)/);
  assert.match(referral, /shareUrl: referralShareUrl/);

  assert.match(shell, /referral-code-ui\.js/);
  assert.match(ui, /user\.getIdToken\(true\)/);
  assert.match(ui, /getReferralCodeCall/);
  assert.match(ui, /COPY INVITE LINK/);
  assert.doesNotMatch(ui, /firebase-firestore|setDoc|updateDoc|addDoc/);
});

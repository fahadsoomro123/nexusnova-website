'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('X Apple and Facebook use official Firebase provider classes', () => {
  const code = read('assets/js/external-auth-ui.js');
  const shell = read('assets/js/account-shell.js');

  assert.match(code, /TwitterAuthProvider/);
  assert.match(code, /FacebookAuthProvider/);
  assert.match(code, /new OAuthProvider\(['"]apple\.com['"]\)/);
  assert.match(code, /providerId: ['"]twitter\.com['"]/);
  assert.match(code, /providerId: ['"]facebook\.com['"]/);
  assert.match(code, /providerId: ['"]apple\.com['"]/);
  assert.match(code, /signInWithPopup\(auth, config\.provider\)/);
  assert.match(code, /linkWithPopup\(user, config\.provider\)/);
  assert.match(shell, /external-auth-ui\.js\?v=20260831-5/);
});

test('Facebook auth does not force an unavailable email scope', () => {
  const code = read('assets/js/external-auth-ui.js');
  assert.doesNotMatch(code, /facebook\.addScope\(['"]email['"]\)/);
});

test('external providers remain truthful when configuration is unavailable or identity is already used', () => {
  const code = read('assets/js/external-auth-ui.js');

  assert.match(code, /auth\/operation-not-allowed/);
  assert.match(code, /not enabled on the Firebase project yet/);
  assert.match(code, /auth\/credential-already-in-use/);
  assert.match(code, /already connected to another NexusNova account/);
  assert.match(code, /auth\/account-exists-with-different-credential/);
  assert.match(code, /auth\/requires-recent-login/);
  assert.match(code, /providerData/);
});

test('external provider buttons do not mint NVX or fake Instagram support', () => {
  const code = read('assets/js/external-auth-ui.js');
  const account = read('account.html');

  assert.match(code, /attachReferralCall/);
  assert.doesNotMatch(code, /updateDoc|writeBatch|increment\s*\(|rewardAmount|rewardValue|referralRewards/);
  assert.doesNotMatch(code, /InstagramAuthProvider|providerId:\s*['"]instagram/);
  assert.match(account, /data-mission="instagram"/);
  assert.match(account, /Supported Meta\/Instagram verification is not active yet/);
});

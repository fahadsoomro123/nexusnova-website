'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Google gateway uses official Firebase popup auth with truthful errors', () => {
  const google = read('assets/js/google-auth-ui.js');
  const shell = read('assets/js/account-shell.js');

  assert.match(google, /GoogleAuthProvider/);
  assert.match(google, /signInWithPopup\(auth, provider\)/);
  assert.doesNotMatch(google, /signInWithRedirect|linkWithRedirect|getRedirectResult|initTokenClient|requestAccessToken|signInWithCredential|linkWithCredential/);
  assert.match(google, /auth\/operation-not-allowed/);
  assert.match(google, /auth\/unauthorized-domain/);
  assert.match(google, /auth\/web-storage-unsupported/);
  assert.match(google, /auth\/popup-blocked/);
  assert.match(google, /auth\/popup-closed-by-user/);
  assert.match(google, /auth\/account-exists-with-different-credential/);
  assert.match(google, /safeAuthCode/);
  assert.match(google, /withAuthCode/);
  assert.match(shell, /google-auth-ui\.js\?v=20260831-5/);
  assert.doesNotMatch(shell, /google-auth-return-recovery/);
  assert.match(shell, /\[data-account-form\].*\[data-dashboard\]/s);
});

test('Google account linking uses Firebase popup and preserves identity safety', () => {
  const google = read('assets/js/google-auth-ui.js');

  assert.match(google, /linkWithPopup\(user, provider\)/);
  assert.match(google, /providerData/);
  assert.match(google, /providerId === ['"]google\.com['"]/);
  assert.match(google, /auth\/credential-already-in-use/);
  assert.match(google, /auth\/provider-already-linked/);
  assert.match(google, /auth\/requires-recent-login/);
  assert.match(google, /data-mission=\"google\"/);
  assert.match(google, /dataset\.authErrorCode/);
  assert.match(google, /connected \? ['"]CONNECTED['"] : ['"]READY['"]/);
});

test('Google auth does not mint rewards or directly mutate existing value state', () => {
  const google = read('assets/js/google-auth-ui.js');

  assert.match(google, /getDoc\(ref\)/);
  assert.match(google, /if \(snap\.exists\(\)\) return/);
  assert.match(google, /attachReferralCall/);
  assert.doesNotMatch(google, /updateDoc|writeBatch|increment\s*\(|rewardAmount|rewardValue|referralRewards/);
  assert.doesNotMatch(google, /doc\(db,\s*['"]referrals['"]|doc\(db,\s*['"]referralCodes['"]/);
});

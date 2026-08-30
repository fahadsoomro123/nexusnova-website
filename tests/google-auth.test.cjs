'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Google gateway uses official Firebase full-page redirect auth with truthful errors', () => {
  const google = read('assets/js/google-auth-ui.js');
  const shell = read('assets/js/account-shell.js');
  const register = read('register.html');

  assert.match(google, /GoogleAuthProvider/);
  assert.match(google, /signInWithRedirect\(auth, provider\)/);
  assert.match(google, /getRedirectResult\(auth\)/);
  assert.doesNotMatch(google, /signInWithPopup|linkWithPopup|POPUP_FALLBACK_CODES|shouldUseRedirectFallback/);
  assert.match(google, /getAdditionalUserInfo/);
  assert.match(google, /auth\/operation-not-allowed/);
  assert.match(google, /auth\/unauthorized-domain/);
  assert.match(google, /auth\/web-storage-unsupported/);
  assert.match(google, /auth\/account-exists-with-different-credential/);
  assert.match(google, /safeAuthCode/);
  assert.match(google, /withAuthCode/);
  assert.match(shell, /google-auth-ui\.js\?v=20260831-3/);
  assert.match(shell, /\[data-account-form\].*\[data-dashboard\]/s);
  assert.match(register, /account-shell\.js\?v=20260831-2/);
});

test('Google account linking is redirect-only and preserves identity safety', () => {
  const google = read('assets/js/google-auth-ui.js');

  assert.match(google, /linkWithRedirect\(user, provider\)/);
  assert.match(google, /resumeRedirectResult/);
  assert.match(google, /providerData/);
  assert.match(google, /providerId === ['"]google\.com['"]/);
  assert.match(google, /auth\/credential-already-in-use/);
  assert.match(google, /auth\/provider-already-linked/);
  assert.match(google, /auth\/requires-recent-login/);
  assert.match(google, /data-mission=\"google\"/);
  assert.match(google, /dataset\.authErrorCode/);
  assert.match(google, /connected \? ['"]CONNECTED['"] : ['"]READY['"]/);
  assert.doesNotMatch(google, /popup/i);
});

test('Google auth does not mint rewards or directly mutate existing value state', () => {
  const google = read('assets/js/google-auth-ui.js');

  assert.match(google, /getDoc\(ref\)/);
  assert.match(google, /if \(snap\.exists\(\)\) return/);
  assert.match(google, /attachReferralCall/);
  assert.doesNotMatch(google, /updateDoc|writeBatch|increment\s*\(|rewardAmount|rewardValue|referralRewards/);
  assert.doesNotMatch(google, /doc\(db,\s*['"]referrals['"]|doc\(db,\s*['"]referralCodes['"]/);
});

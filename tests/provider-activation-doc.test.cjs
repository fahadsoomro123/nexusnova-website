'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('provider activation doc stays aligned with live Firebase auth domain and provider ids', () => {
  const doc = read('docs/AUTH-PROVIDER-ACTIVATION.md');
  const google = read('assets/js/google-auth-ui.js');
  const external = read('assets/js/external-auth-ui.js');

  assert.match(google, /authDomain:\s*['"]nexusnova-6ade2\.firebaseapp\.com['"]/);
  assert.match(external, /authDomain:\s*['"]nexusnova-6ade2\.firebaseapp\.com['"]/);
  assert.match(doc, /https:\/\/nexusnova-6ade2\.firebaseapp\.com\/__\/auth\/handler/);
  assert.match(doc, /`nexusnovatools\.com`/);

  assert.match(google, /GoogleAuthProvider\.credential/);
  assert.match(google, /accounts\.oauth2\.initTokenClient/);
  assert.match(external, /new TwitterAuthProvider\(\)/);
  assert.match(external, /new FacebookAuthProvider\(\)/);
  assert.match(external, /new OAuthProvider\(['"]apple\.com['"]\)/);
  assert.match(external, /providerId:\s*['"]twitter\.com['"]/);
  assert.match(external, /providerId:\s*['"]facebook\.com['"]/);
  assert.match(external, /providerId:\s*['"]apple\.com['"]/);
});

test('provider activation contract forbids secret leakage and fake Instagram auth', () => {
  const doc = read('docs/AUTH-PROVIDER-ACTIVATION.md');
  const external = read('assets/js/external-auth-ui.js');

  assert.match(doc, /Never commit provider API secrets/i);
  assert.match(doc, /Do \*\*not\*\* invent an `InstagramAuthProvider`/);
  assert.doesNotMatch(external, /InstagramAuthProvider|providerId:\s*['"]instagram/i);
});

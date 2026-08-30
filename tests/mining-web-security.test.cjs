const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = path => fs.readFileSync(path, 'utf8');

test('account dashboard uses one real-state mining card', () => {
  const html = read('account.html');
  assert.match(html, /data-mining-card/);
  assert.match(html, /data-mining-action/);
  assert.match(html, /data-mining-progress/);
  assert.match(html, /assets\/js\/mining-dashboard\.js/);
  assert.match(html, /assets\/js\/account-eligibility-ui\.js/);
  assert.match(html, /assets\/css\/mining-dashboard\.css/);
  assert.doesNotMatch(html, /class="nn-webapp-overview"/);
  assert.doesNotMatch(html, /class="nn-nvx-console"/);
  assert.doesNotMatch(html, /class="nn-halving-console"/);
});

test('browser mining controller is read-only and delegates value writes to Worker', () => {
  const client = read('assets/js/mining-dashboard.js');
  assert.match(client, /onSnapshot/);
  assert.match(client, /api\/mining\/session/);
  assert.match(client, /RESTART MINING/);
  assert.match(client, /SESSION_MS = 86_400_000/);
  assert.match(client, /SESSION_REWARD = 24/);
  assert.match(client, /Pending NVX is not added to balance/);
  assert.doesNotMatch(client, /updateDoc|setDoc|runTransaction|writeBatch/);
});

test('Worker mining endpoint enforces eligibility and exact 24H rollover contract', () => {
  const api = read('cloudflare/telegram-bot/mining-api.js');
  const entry = read('cloudflare/telegram-bot/worker-entry.js');

  assert.match(api, /accountEligibilityRequest\(request, env\)/);
  assert.match(api, /eligibleForValueActions !== true/);
  assert.match(api, /SESSION_MS = 86_400_000/);
  assert.match(api, /SESSION_REWARD = 24/);
  assert.match(api, /now - state\.miningStartedAt < SESSION_MS/);
  assert.match(api, /balance: fsNumber\(state\.balance \+ SESSION_REWARD\)/);
  assert.match(api, /totalMined: fsNumber\(state\.totalMined \+ SESSION_REWARD\)/);
  assert.match(api, /novaVaultPending: fsInt\(state\.novaVaultPending \+ 1\)/);
  assert.match(api, /miningStartedAt: fsInt\(now\)/);
  assert.match(api, /body: \{ writes, transaction \}/);
  assert.match(entry, /MINING_SESSION_PATH/);
  assert.match(entry, /\/api\/mining\/session/);
  assert.match(entry, /miningSessionRequest\(request, env\)/);
});

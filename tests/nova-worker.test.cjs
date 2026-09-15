const test = require('node:test');
const assert = require('node:assert/strict');

test('Nova status is truthful and origin protected', async () => {
  const { default: worker } = await import('../cloudflare/telegram-bot/worker-entry.js');
  const status = await worker.fetch(new Request('https://worker.test/api/nova/status', {
    headers: { Origin: 'https://nexusnovatools.com' }
  }), {});
  assert.equal(status.status, 200);
  assert.deepEqual(await status.json(), {
    ok: true,
    aiConfigured: false,
    providers: { gemini: false, openai: false }
  });

  const denied = await worker.fetch(new Request('https://worker.test/api/nova/status', {
    headers: { Origin: 'https://evil.example' }
  }), {});
  assert.equal(denied.status, 403);
});

test('Nova does not expose provider details when unconfigured', async () => {
  const { default: worker } = await import('../cloudflare/telegram-bot/worker-entry.js');
  const response = await worker.fetch(new Request('https://worker.test/api/nova', {
    method: 'POST',
    headers: {
      Origin: 'https://nexusnovatools.com',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message: 'Explain compound interest.' })
  }), {});
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.ok, false);
  assert.equal(body.code, 'provider-unavailable');
  assert.equal(body.answer.includes('GEMINI_API_KEY'), false);
});

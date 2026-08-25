'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../assets/js/telegram-webapp.js'), 'utf8');

function runBridge(webApp = null) {
  const calls = [];
  const root = {
    dataset: {},
    style: { setProperty(name, value) { calls.push(['style', name, value]); } }
  };
  const window = {
    Telegram: webApp ? { WebApp: webApp } : undefined,
    dispatchEvent(event) { calls.push(['event', event.type, event.detail]); }
  };
  const context = {
    window,
    document: { documentElement: root },
    URL,
    CustomEvent: class CustomEvent {
      constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
    },
    localStorage: {
      setItem() { throw new Error('Telegram identity must not be written to localStorage.'); }
    }
  };
  vm.runInNewContext(source, context, { filename: 'telegram-webapp.js' });
  return { bridge: window.NexusNovaTelegram, calls, root };
}

test('normal browser fallback is inert and safe', () => {
  const { bridge, calls } = runBridge();
  assert.equal(bridge.isAvailable, false);
  assert.equal(bridge.getInitData(), '');
  assert.equal(bridge.getUser(), null);
  assert.equal(calls.at(-1)[0], 'event');
});

test('Telegram launch exposes required display fields and raw initData', () => {
  let ready = 0;
  let expanded = 0;
  const { bridge, root } = runBridge({
    initData: 'query_id=AAE&auth_date=1800000000&hash=abc',
    initDataUnsafe: { user: {
      id: 123456789,
      username: 'fahad_test',
      first_name: 'Fahad',
      last_name: 'Hussain',
      photo_url: 'https://t.me/i/userpic/320/test.jpg'
    } },
    platform: 'android',
    version: '9.1',
    ready() { ready += 1; },
    expand() { expanded += 1; },
    setHeaderColor() {},
    setBackgroundColor() {},
    close() {}
  });
  assert.equal(bridge.isAvailable, true);
  assert.equal(bridge.user.id, '123456789');
  assert.equal(bridge.user.username, 'fahad_test');
  assert.equal(bridge.user.firstName, 'Fahad');
  assert.equal(bridge.user.photoUrl, 'https://t.me/i/userpic/320/test.jpg');
  assert.match(bridge.getInitData(), /auth_date/);
  assert.equal(root.dataset.telegramMiniApp, 'true');
  assert.equal(ready, 1);
  assert.equal(expanded, 1);
});

test('initDataUnsafe alone never activates Telegram identity', () => {
  const { bridge } = runBridge({
    initData: '',
    initDataUnsafe: { user: { id: 123, first_name: 'Spoofed' } },
    ready() {}, expand() {}, close() {}
  });
  assert.equal(bridge.isAvailable, false);
  assert.equal(bridge.getInitData(), '');
});

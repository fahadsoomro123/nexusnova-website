'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../assets/js/telegram-webapp.js'), 'utf8');

function makeInitData(user = { id: 123456789, first_name: 'Fahad', username: 'fahad_test' }) {
  return new URLSearchParams({
    auth_date: '1800000000',
    hash: 'abc',
    user: JSON.stringify(user)
  }).toString();
}

function runBridge(webApp = null, options = {}) {
  const calls = [];
  const store = new Map(Object.entries(options.storage || {}));
  const root = {
    dataset: {},
    style: { setProperty(name, value) { calls.push(['style', name, value]); } }
  };
  const window = {
    Telegram: options.telegram || (webApp ? { WebApp: webApp } : undefined),
    location: { hash: options.hash || '' },
    sessionStorage: {
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      setItem(key, value) { store.set(key, String(value)); },
      removeItem(key) { store.delete(key); }
    },
    dispatchEvent(event) { calls.push(['event', event.type, event.detail]); }
  };
  const context = {
    window,
    document: { documentElement: root },
    URL,
    URLSearchParams,
    CustomEvent: class CustomEvent {
      constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
    },
    localStorage: {
      setItem() { throw new Error('Telegram identity must not be written to localStorage.'); }
    }
  };
  vm.runInNewContext(source, context, { filename: 'telegram-webapp.js' });
  return { bridge: window.NexusNovaTelegram, calls, root, store };
}

test('normal browser fallback is inert and safe', () => {
  const { bridge, calls } = runBridge();
  assert.equal(bridge.isAvailable, false);
  assert.equal(bridge.source, 'none');
  assert.equal(bridge.reason, 'missing-init-data');
  assert.equal(bridge.getInitData(), '');
  assert.equal(bridge.getUser(), null);
  assert.equal(bridge.getAuthDate(), '');
  assert.equal(bridge.getDiagnostic().authDatePresent, false);
  assert.equal(calls.at(-1)[0], 'event');
});

test('Telegram launch exposes required display fields, raw initData and launch auth date', () => {
  let ready = 0;
  let expanded = 0;
  const initData = makeInitData({
    id: 123456789,
    username: 'fahad_test',
    first_name: 'Fahad',
    last_name: 'Hussain',
    photo_url: 'https://t.me/i/userpic/320/test.jpg'
  });
  const { bridge, root, store } = runBridge({
    initData,
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
  assert.equal(bridge.source, 'webapp');
  assert.equal(bridge.user.id, '123456789');
  assert.equal(bridge.user.username, 'fahad_test');
  assert.equal(bridge.user.firstName, 'Fahad');
  assert.equal(bridge.user.photoUrl, 'https://t.me/i/userpic/320/test.jpg');
  assert.match(bridge.getInitData(), /auth_date/);
  assert.equal(bridge.getAuthDate(), '1800000000');
  assert.equal(bridge.getDiagnostic().authDatePresent, true);
  assert.equal(store.get('nexusnova_telegram_init_data_v1'), initData);
  assert.equal(root.dataset.telegramMiniApp, 'true');
  assert.equal(root.dataset.telegramInitSource, 'webapp');
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

test('recovers signed initData from Telegram SDK session storage after navigation', () => {
  const initData = makeInitData();
  const { bridge } = runBridge(
    { initData: '', initDataUnsafe: {}, ready() {}, expand() {}, close() {} },
    {
      storage: {
        '__telegram__initParams': JSON.stringify({
          tgWebAppData: initData,
          tgWebAppVersion: '9.1',
          tgWebAppPlatform: 'android'
        })
      }
    }
  );
  assert.equal(bridge.isAvailable, true);
  assert.equal(bridge.source, 'telegram-storage');
  assert.equal(bridge.getUser().id, '123456789');
  assert.equal(bridge.getInitData(), initData);
  assert.equal(bridge.getAuthDate(), '1800000000');
});

test('recovers signed initData from Telegram launch hash', () => {
  const initData = makeInitData();
  const hash = '#' + new URLSearchParams({
    tgWebAppData: initData,
    tgWebAppVersion: '9.1',
    tgWebAppPlatform: 'android'
  }).toString();

  const { bridge } = runBridge(
    { initData: '', initDataUnsafe: {}, ready() {}, expand() {}, close() {} },
    { hash }
  );

  assert.equal(bridge.isAvailable, true);
  assert.equal(bridge.source, 'hash');
  assert.equal(bridge.getUser().id, '123456789');
  assert.equal(bridge.getInitData(), initData);
  assert.equal(bridge.getAuthDate(), '1800000000');
});

test('recovers signed initData from Telegram WebView init params', () => {
  const initData = makeInitData();
  const telegram = {
    WebApp: { initData: '', initDataUnsafe: {}, ready() {}, expand() {}, close() {} },
    WebView: { initParams: { tgWebAppData: initData } }
  };
  const { bridge } = runBridge(null, { telegram });
  assert.equal(bridge.isAvailable, true);
  assert.equal(bridge.source, 'webview');
  assert.equal(bridge.getUser().id, '123456789');
  assert.equal(bridge.getAuthDate(), '1800000000');
});

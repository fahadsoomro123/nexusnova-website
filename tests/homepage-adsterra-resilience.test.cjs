'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function getAdsterraLoader() {
  const start = homepage.indexOf('<script id="nn-adsterra-auto-loader">');
  const openEnd = homepage.indexOf('>', start);
  const close = homepage.indexOf('</script>', openEnd);
  assert.ok(start >= 0 && openEnd > start && close > openEnd, 'homepage Adsterra loader must exist');
  return homepage.slice(openEnd + 1, close);
}

test('Adsterra preserves GPC privacy opt-out and does not change the publisher placement', () => {
  const loader = getAdsterraLoader();
  assert.ok(homepage.includes('data-nn-adsterra-placement'));
  assert.ok(homepage.includes('container-b7cb02fa163a7585244e7c2876553cea'));
  assert.ok(loader.includes('window.navigator?.globalPrivacyControl === true'));
  assert.ok(loader.includes('Ad loading is disabled because your browser sent a Global Privacy Control signal.'));
  assert.ok(loader.includes('https://pl31802817.profitableratecpmnetwork.com/b7cb02fa163a7585244e7c2876553cea/invoke.js'));
});

test('Adsterra loads near the placement during idle time instead of starting with initial HTML parse', () => {
  const loader = getAdsterraLoader();
  assert.ok(loader.includes("typeof window.IntersectionObserver === 'function'"));
  assert.ok(loader.includes("rootMargin: '600px 0px', threshold: 0.01"));
  assert.ok(loader.includes('observer.observe(placement)'));
  assert.ok(loader.includes('observer.disconnect()'));
  assert.ok(loader.includes("window.requestIdleCallback(loadAdsterra, { timeout: 1500 })"));
  assert.ok(loader.includes("window.addEventListener('load', scheduleAdLoad, { once: true })"));
  assert.ok(!loader.includes('loadAdsterra();\n    })();'), 'no direct initial-load ad request is permitted');
});

test('Adsterra network failures receive two bounded retries and a graceful terminal state', () => {
  const loader = getAdsterraLoader();
  assert.ok(loader.includes('const maxAttempts = 3;'));
  assert.ok(loader.includes("script.addEventListener('error', () => {"));
  assert.ok(loader.includes('script.remove()'));
  assert.ok(loader.includes('attempts < maxAttempts'));
  assert.ok(loader.includes('attempts * 1000'));
  assert.ok(loader.includes("window.__nexusnovaAdsterraState = 'retrying'"));
  assert.ok(loader.includes("window.__nexusnovaAdsterraState = 'failed'"));
  assert.ok(loader.includes('The external ad network is unavailable right now. The website tools remain available.'));
  assert.ok(!loader.includes('Please refresh later.'));
});


const vm = require('node:vm');

function runAdsterraLoader({ globalPrivacyControl = false } = {}) {
  const inserted = [];
  const idleTasks = [];
  const timers = [];
  const observers = [];
  const placement = { id: 'placement' };
  const status = { textContent: '' };
  let nextTimerId = 1;

  const container = {
    parentNode: {
      insertBefore(script) { inserted.push(script); }
    }
  };

  class MockIntersectionObserver {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.disconnected = false;
      observers.push(this);
    }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
    trigger(isIntersecting) {
      this.callback([{ isIntersecting }]);
    }
  }

  const document = {
    querySelector(selector) {
      if (selector === '[data-nn-adsterra-placement]') return placement;
      if (selector === '[data-nn-adsterra-status]') return status;
      return null;
    },
    getElementById(id) {
      return id === 'container-b7cb02fa163a7585244e7c2876553cea' ? container : null;
    },
    createElement(tag) {
      assert.equal(tag, 'script');
      const handlers = {};
      return {
        tagName: tag,
        async: false,
        dataset: {},
        attributes: {},
        src: '',
        removed: false,
        addEventListener(eventName, callback) { handlers[eventName] = callback; },
        setAttribute(name, value) { this.attributes[name] = value; },
        remove() { this.removed = true; },
        trigger(eventName) { if (handlers[eventName]) handlers[eventName](); }
      };
    },
    readyState: 'complete'
  };

  const window = {
    navigator: { globalPrivacyControl },
    document,
    __nexusnovaAdsterraState: undefined,
    IntersectionObserver: MockIntersectionObserver,
    requestIdleCallback(callback, options) { idleTasks.push({ callback, options }); },
    setTimeout(callback, delay) {
      const timer = { id: nextTimerId++, callback, delay, cancelled: false };
      timers.push(timer);
      return timer.id;
    },
    clearTimeout(id) {
      const timer = timers.find(item => item.id === id);
      if (timer) timer.cancelled = true;
    },
    addEventListener() {}
  };

  const loader = getAdsterraLoader();
  vm.runInNewContext(loader, { window, document, IntersectionObserver: MockIntersectionObserver });
  return { window, document, inserted, idleTasks, timers, observers, placement, status };
}

test('Adsterra remains unloaded until placement nears viewport and an idle callback runs', () => {
  const state = runAdsterraLoader();
  assert.equal(state.inserted.length, 0, 'no third-party ad script should load during initial HTML execution');
  assert.equal(state.observers.length, 1);
  assert.equal(state.observers[0].target, state.placement);
  assert.equal(state.observers[0].options.rootMargin, '600px 0px');

  state.observers[0].trigger(false);
  assert.equal(state.idleTasks.length, 0, 'non-intersecting placement must not start ad work');

  state.observers[0].trigger(true);
  assert.equal(state.observers[0].disconnected, true, 'observer must be removed once the placement is near');
  assert.equal(state.idleTasks.length, 1);
  assert.equal(state.inserted.length, 0, 'intersection alone must still wait for idle time');

  state.idleTasks[0].callback();
  assert.equal(state.inserted.length, 1);
  assert.equal(state.inserted[0].async, true);
  assert.equal(state.inserted[0].src, 'https://pl31802817.profitableratecpmnetwork.com/b7cb02fa163a7585244e7c2876553cea/invoke.js');
  assert.equal(state.window.__nexusnovaAdsterraState, 'loading');
});

test('Adsterra retries two transient load failures then settles on a non-blocking failure state', () => {
  const state = runAdsterraLoader();
  state.observers[0].trigger(true);
  state.idleTasks[0].callback();

  const first = state.inserted[0];
  first.trigger('error');
  assert.equal(first.removed, true);
  assert.equal(state.window.__nexusnovaAdsterraState, 'retrying');

  const retryOne = state.timers.find(timer => !timer.cancelled);
  assert.equal(retryOne.delay, 1000);
  retryOne.cancelled = true; // Simulate the browser consuming this timer.
  retryOne.callback();
  assert.equal(state.inserted.length, 2);
  state.inserted[1].trigger('error');

  const retryTwo = state.timers.filter(timer => !timer.cancelled).at(-1);
  assert.equal(retryTwo.delay, 2000);
  retryTwo.cancelled = true; // Simulate the browser consuming this timer.
  retryTwo.callback();
  assert.equal(state.inserted.length, 3);
  state.inserted[2].trigger('error');

  assert.equal(state.window.__nexusnovaAdsterraState, 'failed');
  assert.match(state.status.textContent, /website tools remain available/i);
  assert.equal(state.timers.filter(timer => !timer.cancelled).length, 0, 'no retries may remain after the terminal state');
});

test('Adsterra obeys Global Privacy Control without creating a script or observer', () => {
  const state = runAdsterraLoader({ globalPrivacyControl: true });
  assert.equal(state.inserted.length, 0);
  assert.equal(state.observers.length, 0);
  assert.match(state.status.textContent, /Global Privacy Control/i);
  assert.equal(state.window.__nexusnovaAdsterraState, undefined);
});

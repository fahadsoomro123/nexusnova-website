import { getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const SESSION_MS = 86_400_000;
const SESSION_REWARD = 24;
const ENDPOINT = 'https://nexusnova-telegram-bot.fahadsoomro123.workers.dev/api/mining/session';
const WAIT_MS = 5000;

let currentUser = null;
let currentState = null;
let unsubscribeProfile = null;
let ticker = null;
let operationPending = false;

const $ = selector => document.querySelector(selector);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

if ($('[data-mining-card]')) boot();

async function boot() {
  const app = await waitForFirebaseApp();
  if (!app) return paintUnavailable('Firebase account state is unavailable.');

  const auth = getAuth(app);
  const db = getFirestore(app);

  onAuthStateChanged(auth, user => {
    currentUser = user || null;
    if (unsubscribeProfile) {
      unsubscribeProfile();
      unsubscribeProfile = null;
    }
    stopTicker();

    if (!user) {
      currentState = null;
      paintSignedOut();
      return;
    }

    paintSyncing();
    unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), snapshot => {
      if (!snapshot.exists()) {
        currentState = null;
        paintUnavailable('NexusNova profile is not ready yet.');
        return;
      }
      currentState = normalizeState(snapshot.data() || {});
      render();
    }, error => {
      console.warn('[NexusNova mining]', error?.code || error?.message || error);
      currentState = null;
      paintUnavailable('Secure mining state could not be loaded.');
    });
  });

  const button = $('[data-mining-action]');
  if (button) button.addEventListener('click', handleAction);

  if ('MutationObserver' in window) {
    new MutationObserver(() => render()).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-value-eligibility', 'data-value-eligibility-reason']
    });
  }
}

async function waitForFirebaseApp() {
  const started = Date.now();
  while (Date.now() - started < WAIT_MS) {
    const apps = getApps();
    if (apps.length) return apps[0];
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  return null;
}

function normalizeState(profile) {
  const balance = safeNumber(profile.balance);
  const totalMined = safeNumber(profile.totalMined);
  const miningStartedAt = safeNumber(profile.miningStartedAt, 0);
  const miningActive = profile.miningActive === true;
  const valid = Number.isFinite(balance) && balance >= 0 &&
    Number.isFinite(totalMined) && totalMined >= 0 &&
    Number.isFinite(miningStartedAt) && miningStartedAt >= 0 &&
    !(!miningActive && miningStartedAt !== 0) &&
    !(miningActive && miningStartedAt <= 0);
  return { balance, totalMined, miningStartedAt, miningActive, valid };
}

function safeNumber(value, fallback = NaN) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function render() {
  if (!currentUser) return paintSignedOut();
  if (!currentState) return;
  if (!currentState.valid) return paintInvalid();

  const state = sessionView(currentState, Date.now());
  const card = $('[data-mining-card]');
  if (card) card.dataset.state = state.mode;

  setText('[data-mining-badge]', state.badge);
  setText('[data-mining-title]', state.title);
  setBalance(currentState.balance);
  setText('[data-mining-total]', `${currentState.totalMined.toFixed(4)} NVX`);
  setText('[data-mining-timer]', state.timer);
  setText('[data-mining-progress-copy]', state.progressCopy);
  setText('[data-mining-message]', state.message);

  const bar = $('[data-mining-progress]');
  if (bar) bar.style.width = `${state.progress.toFixed(3)}%`;
  const progress = $('[data-mining-progress-track]');
  if (progress) progress.setAttribute('aria-valuenow', state.progress.toFixed(1));

  paintButton(state);
  if (state.mode === 'active') startTicker();
  else stopTicker();
}

function sessionView(state, now) {
  if (!state.miningActive) {
    return {
      mode: 'ready',
      badge: 'READY',
      title: 'Mining is ready for a manual start.',
      timer: 'NOT STARTED',
      progress: 0,
      progressCopy: `0.0000 / ${SESSION_REWARD.toFixed(4)} NVX pending`,
      message: 'Start is manual. Account creation never starts mining automatically.',
      action: 'start'
    };
  }

  const elapsed = Math.max(0, now - state.miningStartedAt);
  const bounded = clamp(elapsed, 0, SESSION_MS);
  const progress = (bounded / SESSION_MS) * 100;
  const pending = (bounded / SESSION_MS) * SESSION_REWARD;

  if (elapsed >= SESSION_MS) {
    return {
      mode: 'complete',
      badge: 'SESSION COMPLETE',
      title: '24H complete — claim and start the next session.',
      timer: '24H COMPLETE',
      progress: 100,
      progressCopy: `${SESSION_REWARD.toFixed(4)} NVX ready to claim`,
      message: 'Restart Mining securely claims the completed +24 NVX session and starts the next 24H session in one transaction.',
      action: 'restart'
    };
  }

  return {
    mode: 'active',
    badge: '● LIVE',
    title: 'NVX mining session is live.',
    timer: `${formatDuration(SESSION_MS - elapsed)} remaining`,
    progress,
    progressCopy: `${pending.toFixed(4)} / ${SESSION_REWARD.toFixed(4)} NVX pending`,
    message: 'Live progress is calculated from the real Firestore session start. Pending NVX is not added to balance until the 24H session completes.',
    action: null
  };
}

function paintButton(state) {
  const button = $('[data-mining-action]');
  if (!button) return;

  const eligible = document.documentElement.dataset.valueEligibility === 'eligible';
  const reason = document.documentElement.dataset.valueEligibilityReason || 'eligibility-check-pending';
  button.dataset.action = state.action || '';

  if (operationPending) {
    button.disabled = true;
    button.textContent = 'SECURELY UPDATING…';
    return;
  }
  if (state.mode === 'active') {
    button.disabled = true;
    button.textContent = 'MINING LIVE';
    button.removeAttribute('title');
    return;
  }
  if (!eligible) {
    button.disabled = true;
    button.textContent = state.mode === 'complete' ? 'RESTART LOCKED' : 'START LOCKED';
    button.title = `Unavailable: ${reason}`;
    return;
  }

  button.disabled = false;
  button.removeAttribute('title');
  button.textContent = state.mode === 'complete' ? 'RESTART MINING' : 'START MINING';
}

async function handleAction() {
  if (operationPending || !currentUser || !currentState?.valid) return;
  const state = sessionView(currentState, Date.now());
  const action = state.action;
  if (!action) return;
  if (document.documentElement.dataset.valueEligibility !== 'eligible') {
    setText('[data-mining-message]', 'Server eligibility must pass before mining can start or restart.');
    return;
  }

  operationPending = true;
  render();
  try {
    const idToken = await currentUser.getIdToken(true);
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ action }),
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer'
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result?.ok !== true) {
      const error = new Error(result?.error || `Mining request failed (${response.status}).`);
      error.code = result?.code || `http-${response.status}`;
      throw error;
    }
    setText('[data-mining-message]', result.message || 'Mining state updated securely.');
  } catch (error) {
    console.warn('[NexusNova mining action]', error?.code || error?.message || error);
    setText('[data-mining-message]', error?.message || 'Mining action could not be completed.');
  } finally {
    operationPending = false;
    render();
  }
}

function setBalance(value) {
  const el = $('[data-web-nvx-balance]');
  if (!el) return;
  el.innerHTML = Number.isFinite(value) && value >= 0
    ? `${value.toFixed(4)} <small>NVX</small>`
    : `— <small>NVX</small>`;
}

function paintSyncing() {
  const card = $('[data-mining-card]');
  if (card) card.dataset.state = 'syncing';
  setText('[data-mining-badge]', 'SYNCING');
  setText('[data-mining-title]', 'Syncing secure mining session…');
  setText('[data-mining-timer]', 'CHECKING');
  setText('[data-mining-total]', '— NVX');
  setText('[data-mining-progress-copy]', 'Reading real Firestore state…');
  setText('[data-mining-message]', 'No placeholder mining state is shown while account data is loading.');
  const button = $('[data-mining-action]');
  if (button) { button.disabled = true; button.textContent = 'CHECKING…'; }
}

function paintSignedOut() {
  stopTicker();
  const card = $('[data-mining-card]');
  if (card) card.dataset.state = 'blocked';
  setText('[data-mining-badge]', 'SIGNED OUT');
  setText('[data-mining-title]', 'Sign in to view mining state.');
  setText('[data-mining-timer]', '—');
  setText('[data-mining-total]', '— NVX');
  setText('[data-mining-progress-copy]', 'No mining state available.');
  setText('[data-mining-message]', 'A signed-in Firebase account is required for mining.');
  const button = $('[data-mining-action]');
  if (button) { button.disabled = true; button.textContent = 'SIGN IN REQUIRED'; }
}

function paintInvalid() {
  stopTicker();
  const card = $('[data-mining-card]');
  if (card) card.dataset.state = 'error';
  setText('[data-mining-badge]', 'STATE ERROR');
  setText('[data-mining-title]', 'Mining state needs secure repair.');
  setText('[data-mining-timer]', 'UNAVAILABLE');
  setText('[data-mining-progress-copy]', 'No calculated progress shown.');
  setText('[data-mining-message]', 'Inconsistent mining fields were detected. No balance or session state was changed.');
  const button = $('[data-mining-action]');
  if (button) { button.disabled = true; button.textContent = 'ACTION UNAVAILABLE'; }
}

function paintUnavailable(message) {
  stopTicker();
  const card = $('[data-mining-card]');
  if (card) card.dataset.state = 'error';
  setText('[data-mining-badge]', 'UNAVAILABLE');
  setText('[data-mining-title]', 'Secure mining state is unavailable.');
  setText('[data-mining-message]', message);
  const button = $('[data-mining-action]');
  if (button) { button.disabled = true; button.textContent = 'ACTION UNAVAILABLE'; }
}

function startTicker() {
  if (ticker) return;
  ticker = window.setInterval(() => render(), 1000);
}

function stopTicker() {
  if (!ticker) return;
  clearInterval(ticker);
  ticker = null;
}

function formatDuration(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function setText(selector, value) {
  const el = $(selector);
  if (el) el.textContent = String(value ?? '');
}

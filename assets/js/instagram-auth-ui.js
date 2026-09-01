import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBU75WYp5ioaMD1LrNcDyAvROFW2wrTil0',
  authDomain: 'nexusnova-6ade2.firebaseapp.com',
  projectId: 'nexusnova-6ade2',
  storageBucket: 'nexusnova-6ade2.firebasestorage.app',
  messagingSenderId: '49791194817',
  appId: '1:49791194817:web:07f28326e0f15979536640',
  measurementId: 'G-YLPFKWSS12'
};

const INSTAGRAM_APP_ID = '1564402658290447';
const REDIRECT_URI = 'https://nexusnovatools.com/instagram-callback.html';
const AUTH_URL = 'https://www.instagram.com/oauth/authorize';
const API_BASE = 'https://nexusnova-telegram-bot.fahadsoomro123.workers.dev';
const STATE_KEY = 'nexusnova_instagram_oauth_state_v1';
const STATE_BACKUP_KEY = 'nexusnova_instagram_oauth_state_backup_v1';
const STATE_COOKIE = 'nexusnova_ig_oauth_state';
const FLOW_MAX_AGE_MS = 10 * 60 * 1000;

const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app);
const card = document.querySelector('[data-mission="instagram"]');

if (card) setupInstagramMission();

function setupInstagramMission() {
  const state = card.querySelector('[data-mission-state]');
  const copy = card.querySelector('[data-mission-copy]');
  const button = card.querySelector('button');
  if (!button) return;

  button.dataset.instagramLink = '1';
  button.hidden = false;
  button.disabled = true;
  button.textContent = 'Checking Instagram…';

  button.addEventListener('click', () => {
    const user = auth.currentUser;
    if (!user || button.disabled) return;

    const oauthState = randomState();
    saveOAuthState(oauthState);

    card.dataset.state = 'pending';
    if (state) state.textContent = 'CONNECTING';
    if (copy) copy.textContent = 'Opening official Instagram Business Login…';
    button.disabled = true;
    button.textContent = 'Connecting…';

    // Same-tab OAuth is deliberate. Android Chrome can isolate popup/tab storage,
    // which breaks OAuth state recovery. A normal top-level navigation preserves
    // this tab's sessionStorage and returns to the same secure callback page.
    location.assign(buildInstagramAuthUrl(oauthState));
  });

  onAuthStateChanged(auth, async user => {
    if (!user) {
      paintSignedOut();
      return;
    }
    await refreshStatus(user);
  });
}

async function refreshStatus(user) {
  try {
    const idToken = await user.getIdToken();
    const result = await callInstagramApi('/api/instagram/status', { idToken });
    if (result?.linked === true) {
      clearOAuthFlow();
      paintConnected(result.user || {});
    } else {
      paintReady();
    }
  } catch (error) {
    const code = String(error?.code || '');
    if (code === 'instagram-not-configured' || code === 'failed-precondition' || code === 'firebase-admin-not-configured') {
      paintConfigRequired();
      return;
    }
    paintError(publicMessage(error));
  }
}

function paintConnected(user) {
  const state = card.querySelector('[data-mission-state]');
  const copy = card.querySelector('[data-mission-copy]');
  const button = card.querySelector('[data-instagram-link]');
  const username = cleanUsername(user?.username);
  card.dataset.state = 'complete';
  if (state) state.textContent = 'CONNECTED';
  if (copy) copy.textContent = username
    ? `Official Instagram identity @${username} is server-verified and linked to this NexusNova account.`
    : 'Official Instagram identity is server-verified and linked to this NexusNova account.';
  if (button) {
    button.hidden = false;
    button.disabled = true;
    button.textContent = 'Connected Instagram';
  }
}

function paintReady() {
  const state = card.querySelector('[data-mission-state]');
  const copy = card.querySelector('[data-mission-copy]');
  const button = card.querySelector('[data-instagram-link]');
  card.dataset.state = 'ready';
  if (state) state.textContent = 'READY';
  if (copy) copy.textContent = 'Connect your official Instagram professional identity through Instagram Business Login.';
  if (button) {
    button.hidden = false;
    button.disabled = false;
    button.textContent = 'Connect Instagram';
  }
}

function paintConfigRequired() {
  const state = card.querySelector('[data-mission-state]');
  const copy = card.querySelector('[data-mission-copy]');
  const button = card.querySelector('[data-instagram-link]');
  card.dataset.state = 'pending';
  if (state) state.textContent = 'CONFIG REQUIRED';
  if (copy) copy.textContent = 'Instagram Business Login is ready, but server verification configuration still needs attention.';
  if (button) {
    button.hidden = false;
    button.disabled = true;
    button.textContent = 'Server setup required';
  }
}

function paintSignedOut() {
  const state = card.querySelector('[data-mission-state]');
  const copy = card.querySelector('[data-mission-copy]');
  const button = card.querySelector('[data-instagram-link]');
  card.dataset.state = 'pending';
  if (state) state.textContent = 'SIGN IN FIRST';
  if (copy) copy.textContent = 'Sign in to your NexusNova account before connecting Instagram.';
  if (button) {
    button.hidden = false;
    button.disabled = true;
    button.textContent = 'Connect Instagram';
  }
}

function paintError(message) {
  const state = card.querySelector('[data-mission-state]');
  const copy = card.querySelector('[data-mission-copy]');
  const button = card.querySelector('[data-instagram-link]');
  card.dataset.state = 'error';
  if (state) state.textContent = 'NOT CONNECTED';
  if (copy) copy.textContent = message;
  if (button) {
    button.hidden = false;
    button.disabled = !auth.currentUser;
    button.textContent = 'Retry Instagram';
  }
}

function buildInstagramAuthUrl(state) {
  const url = new URL(AUTH_URL);
  url.searchParams.set('client_id', INSTAGRAM_APP_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'instagram_business_basic');
  url.searchParams.set('state', state);
  url.searchParams.set('force_reauth', 'true');
  return url.toString();
}

function saveOAuthState(state) {
  const createdAt = Date.now();
  sessionStorage.setItem(STATE_KEY, state);
  try {
    localStorage.setItem(STATE_BACKUP_KEY, JSON.stringify({ state, createdAt }));
  } catch (_) {}
  try {
    const value = encodeURIComponent(JSON.stringify({ state, createdAt }));
    document.cookie = `${STATE_COOKIE}=${value}; Max-Age=600; Path=/; Secure; SameSite=Lax`;
  } catch (_) {}
}

function clearOAuthFlow() {
  sessionStorage.removeItem(STATE_KEY);
  try { localStorage.removeItem(STATE_BACKUP_KEY); } catch (_) {}
  try { document.cookie = `${STATE_COOKIE}=; Max-Age=0; Path=/; Secure; SameSite=Lax`; } catch (_) {}
}

async function callInstagramApi(path, { method = 'GET', idToken, body = null } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${idToken}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    credentials: 'omit',
    referrerPolicy: 'no-referrer'
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result?.ok !== true) {
    const error = new Error(String(result?.error || `Instagram request failed (${response.status}).`));
    error.code = String(result?.code || `http-${response.status}`);
    throw error;
  }
  return result;
}

function randomState() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function cleanUsername(value) {
  const username = String(value || '').trim();
  return /^[A-Za-z0-9._]{1,64}$/.test(username) ? username : '';
}

function publicMessage(error) {
  const code = String(error?.code || '');
  const known = {
    'unauthenticated': 'Sign in to NexusNova again before connecting Instagram.',
    'already-exists': 'This Instagram identity is already linked to another NexusNova account.',
    'instagram-not-configured': 'Instagram server verification is not configured yet.',
    'firebase-admin-not-configured': 'Firebase server verification is not configured correctly.',
    'firebase-private-key-invalid': 'Firebase server verification key needs attention.',
    'instagram-authorization-failed': 'Instagram authorization could not be verified. Please connect again.',
    'instagram-identity-failed': 'Instagram account identity could not be verified.',
    'instagram-unavailable': 'Instagram verification is temporarily unavailable. Please try again.'
  };
  return known[code] || String(error?.message || 'Instagram connection failed.').replace(/\s+/g, ' ').trim().slice(0, 260);
}

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

const API_BASE = 'https://nexusnova-telegram-bot.fahadsoomro123.workers.dev';

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

  button.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user || button.disabled) return;

    card.dataset.state = 'pending';
    if (state) state.textContent = 'CONNECTING';
    if (copy) copy.textContent = 'Preparing secure Instagram Business Login…';
    button.disabled = true;
    button.textContent = 'Connecting…';

    try {
      const idToken = await user.getIdToken(true);
      const start = await callInstagramApi('/api/instagram/start', { method: 'POST', idToken });
      const authUrl = String(start?.authUrl || '');
      if (!/^https:\/\/www\.instagram\.com\/oauth\/authorize(?:\/|\?|$)/.test(authUrl)) {
        throw new Error('Instagram sign-in URL could not be prepared securely.');
      }
      location.assign(authUrl);
    } catch (error) {
      paintError(publicMessage(error));
    }
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
    if (result?.linked === true) paintConnected(result.user || {});
    else paintReady();
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
    'oauth-state-invalid': 'Instagram security check was invalid. Please retry once.',
    'oauth-state-expired': 'Instagram connection session expired. Please retry once.',
    'instagram-authorization-failed': 'Instagram authorization could not be verified. Please connect again.',
    'instagram-identity-failed': 'Instagram account identity could not be verified.',
    'instagram-unavailable': 'Instagram verification is temporarily unavailable. Please try again.'
  };
  return known[code] || String(error?.message || 'Instagram connection failed.').replace(/\s+/g, ' ').trim().slice(0, 260);
}

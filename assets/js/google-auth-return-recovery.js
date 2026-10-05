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

const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app);
const AUTH_MARKER = 'nexusnova_auth_seen_v1';
const isGateway = Boolean(document.querySelector('[data-account-form]'));
const isDashboard = Boolean(document.querySelector('[data-dashboard]'));

function hasGoogleProvider(user) {
  return Array.isArray(user?.providerData) && user.providerData.some(item => item?.providerId === 'google.com');
}

function markDashboardConnected(user) {
  if (!isDashboard || !hasGoogleProvider(user)) return false;
  const card = document.querySelector('[data-mission="google"]');
  if (!card) return false;
  const state = card.querySelector('[data-mission-state]');
  const copy = card.querySelector('[data-mission-copy]');
  const button = card.querySelector('[data-google-link]');
  card.dataset.state = 'complete';
  delete card.dataset.authErrorCode;
  if (state) state.textContent = 'CONNECTED';
  if (copy) copy.textContent = 'Official Google identity is linked to this Firebase account.';
  if (button) {
    button.hidden = true;
    button.disabled = true;
  }
  return true;
}

async function recover(user) {
  if (!user) return;
  try { await user.reload(); } catch (_) {}
  const current = auth.currentUser || user;

  if (isGateway && hasGoogleProvider(current)) {
    try { localStorage.setItem(AUTH_MARKER, '1'); } catch (_) {}
    location.replace('account.html?google=connected');
    return;
  }

  if (isDashboard && !markDashboardConnected(current)) {
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts += 1;
      try { await current.reload(); } catch (_) {}
      const fresh = auth.currentUser || current;
      if (markDashboardConnected(fresh) || attempts >= 4) clearInterval(timer);
    }, 900);
  }
}

onAuthStateChanged(auth, user => {
  recover(user).catch(error => console.warn('[NexusNova Google Recovery]', error?.code || 'recovery-failed'));
});

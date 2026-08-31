import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup,
  getAdditionalUserInfo
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { attachReferralCall } from './referral-account-api.js';

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
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

const AUTH_MARKER = 'nexusnova_auth_seen_v1';
const REFERRAL_KEY = 'nexusnova_pending_referral_v1';
const REFERRAL_RE = /^NVX-[A-Z0-9]{8,16}$/;
const SAFE_AUTH_CODE_RE = /^auth\/[a-z0-9-]+$/;
const DEFINITIVE_REFERRAL_ERRORS = new Set([
  'invalid-referral',
  'referral-not-found',
  'self-referral',
  'referral-window-expired',
  'referral-already-attached'
]);

function cleanText(value, max = 120) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function safeAuthCode(error) {
  const code = String(error?.code || '').trim().toLowerCase();
  return SAFE_AUTH_CODE_RE.test(code) ? code : '';
}

function withAuthCode(message, error) {
  const code = safeAuthCode(error);
  return code ? `${message} [${code}]` : message;
}

function googleErrorMessage(error, linking = false) {
  const code = safeAuthCode(error);
  const known = {
    'auth/operation-not-allowed': 'Google sign-in is not enabled on the Firebase project yet.',
    'auth/unauthorized-domain': 'This website domain is not authorized for Firebase Authentication yet.',
    'auth/network-request-failed': 'Google/Firebase could not complete the network request. Check the connection or VPN and retry.',
    'auth/web-storage-unsupported': 'Browser storage required by Firebase Authentication is blocked. Allow site data/cookies for nexusnovatools.com and retry.',
    'auth/popup-blocked': 'Your browser blocked the Google sign-in window. Allow pop-ups for nexusnovatools.com and retry.',
    'auth/popup-closed-by-user': 'Google sign-in was closed before it finished. Please retry.',
    'auth/cancelled-popup-request': 'Another Google sign-in window was already opening. Please retry once.',
    'auth/account-exists-with-different-credential': 'This email already belongs to a NexusNova account. Sign in with its existing method first, then connect Google from the dashboard.',
    'auth/credential-already-in-use': 'This Google identity is already connected to another NexusNova account. NexusNova will not auto-merge accounts because balance, mining and referral state must remain safe.',
    'auth/provider-already-linked': 'Google is already connected to this NexusNova account.',
    'auth/requires-recent-login': 'For security, sign out and sign in again before connecting Google.',
    'auth/too-many-requests': 'Firebase temporarily limited authentication attempts. Wait briefly and retry.',
    'auth/user-disabled': 'This Firebase account is disabled and cannot link Google.'
  };
  if (known[code]) return known[code];
  return cleanText(error?.message || (linking ? 'Google account linking failed.' : 'Google sign-in failed.'), 240);
}

function currentReferral() {
  const fromUrl = String(new URLSearchParams(location.search).get('ref') || '').trim().toUpperCase();
  if (REFERRAL_RE.test(fromUrl)) return fromUrl;
  try {
    const stored = String(localStorage.getItem(REFERRAL_KEY) || '').trim().toUpperCase();
    return REFERRAL_RE.test(stored) ? stored : '';
  } catch (_) {
    return '';
  }
}

function clearReferral() {
  try { localStorage.removeItem(REFERRAL_KEY); } catch (_) {}
}

async function ensureProfile(user) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return { created: false, profile: snap.data() || {} };
  const profile = {
    uid: user.uid,
    name: cleanText(user.displayName || user.email?.split('@')[0] || 'NexusNova User', 80),
    email: String(user.email || '').slice(0, 320),
    balance: 0,
    totalMined: 0,
    tasksCompleted: 0,
    completedTasks: {},
    miningActive: false,
    miningStartedAt: 0,
    miningLastUpdate: 0,
    sessionEarned: 0,
    lastDailyReward: 0,
    dailyRewardStreak: 0,
    createdAt: serverTimestamp()
  };
  await setDoc(ref, profile);
  return { created: true, profile };
}

async function attachPendingReferralForNewAccount(user) {
  const code = currentReferral();
  if (!code || !user) return;
  try {
    const idToken = await user.getIdToken(true);
    await attachReferralCall({ code, idToken });
    clearReferral();
  } catch (error) {
    const codeName = String(error?.code || '');
    console.warn('[NexusNova Google Referral]', codeName || 'attach-failed');
    if (DEFINITIVE_REFERRAL_ERRORS.has(codeName)) clearReferral();
  }
}

function ensureGoogleStyles() {
  if (document.querySelector('style[data-nn-google-auth-style]')) return;
  const style = document.createElement('style');
  style.dataset.nnGoogleAuthStyle = '1';
  style.textContent = `
    .nn-google-auth-wrap{display:grid;gap:10px;margin:16px 0}
    .nn-google-auth-divider{display:flex;align-items:center;gap:10px;color:rgba(198,214,232,.72);font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
    .nn-google-auth-divider::before,.nn-google-auth-divider::after{content:"";height:1px;flex:1;background:rgba(130,160,194,.22)}
    .nn-google-auth-button{display:flex;align-items:center;justify-content:center;gap:10px;width:100%}
    .nn-google-auth-button .nn-google-g{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#fff;color:#243447;font-weight:900;font-size:15px;box-shadow:0 3px 10px rgba(0,0,0,.16)}
    .nn-google-auth-note{margin:0;color:var(--muted,#738399);font-size:12px;line-height:1.45;text-align:center}
    .nn-mission .nn-google-connect{width:100%;margin-top:auto}
  `;
  document.head.appendChild(style);
}

function gatewayStatus(message, kind = '') {
  const status = document.querySelector('[data-status]');
  if (!status) return;
  status.textContent = message;
  if (kind) status.dataset.kind = kind;
  else delete status.dataset.kind;
}

function hasGoogleProvider(user) {
  return Array.isArray(user?.providerData) && user.providerData.some(item => item?.providerId === 'google.com');
}

function paintGoogleMission(card, user) {
  if (!card) return;
  const state = card.querySelector('[data-mission-state]');
  const copy = card.querySelector('[data-mission-copy]');
  const button = card.querySelector('[data-google-link]');
  const connected = hasGoogleProvider(user);
  delete card.dataset.authErrorCode;
  card.dataset.state = connected ? 'complete' : 'ready';
  if (state) state.textContent = connected ? 'CONNECTED' : 'READY';
  if (copy) copy.textContent = connected
    ? 'Official Google identity is linked to this Firebase account.'
    : 'Connect your official Google identity to this existing NexusNova account.';
  if (button) {
    button.hidden = connected;
    button.disabled = !user || connected;
    button.textContent = 'Connect Google';
  }
}

function paintGoogleError(card, error) {
  if (!card) return;
  const code = safeAuthCode(error);
  const state = card.querySelector('[data-mission-state]');
  const copy = card.querySelector('[data-mission-copy]');
  const button = card.querySelector('[data-google-link]');
  card.dataset.state = 'error';
  if (code) card.dataset.authErrorCode = code;
  if (state) state.textContent = 'NOT CONNECTED';
  if (copy) copy.textContent = withAuthCode(googleErrorMessage(error, true), error);
  if (button) {
    button.hidden = false;
    button.disabled = false;
    button.textContent = 'Retry Google';
  }
}

async function finishGatewayCredential(result) {
  const info = getAdditionalUserInfo(result);
  const ensured = await ensureProfile(result.user);
  if (ensured.created || info?.isNewUser === true) await attachPendingReferralForNewAccount(result.user);
  try { localStorage.setItem(AUTH_MARKER, '1'); } catch (_) {}
  window.gtag?.('event', info?.isNewUser ? 'sign_up' : 'login', { method: 'google-popup' });
  gatewayStatus('Google account verified. Opening your NexusNova dashboard…', 'success');
  location.assign('account.html?google=connected');
}

function setupGateway() {
  const form = document.querySelector('[data-account-form]');
  if (!form || document.querySelector('[data-google-signin]')) return;
  ensureGoogleStyles();
  const wrap = document.createElement('div');
  wrap.className = 'nn-google-auth-wrap';
  wrap.dataset.googleSignin = '1';
  wrap.innerHTML = `
    <div class="nn-google-auth-divider"><span>or use official Google</span></div>
    <button class="account-submit nn-google-auth-button" type="button" data-google-signin-button>
      <span class="nn-google-g" aria-hidden="true">G</span><span>CONTINUE WITH GOOGLE</span>
    </button>
    <p class="nn-google-auth-note">Google uses Firebase's official secure sign-in window. Mining never auto-starts.</p>
  `;
  form.parentNode?.insertBefore(wrap, form);
  const button = wrap.querySelector('[data-google-signin-button]');
  button?.addEventListener('click', async () => {
    if (button.disabled) return;
    button.disabled = true;
    const label = button.querySelector('span:last-child');
    if (label) label.textContent = 'CONNECTING GOOGLE…';
    gatewayStatus('Opening official Google sign-in…');
    try {
      const result = await signInWithPopup(auth, provider);
      await finishGatewayCredential(result);
    } catch (error) {
      console.warn('[NexusNova Google Popup]', safeAuthCode(error) || 'google-popup-failed');
      gatewayStatus(withAuthCode(googleErrorMessage(error, false), error), 'error');
      button.disabled = false;
      if (label) label.textContent = 'CONTINUE WITH GOOGLE';
    }
  });
}

function setupDashboard() {
  const grid = document.querySelector('.nn-missions-grid');
  if (!grid || document.querySelector('[data-mission="google"]')) return;
  ensureGoogleStyles();
  const card = document.createElement('article');
  card.className = 'nn-mission';
  card.dataset.mission = 'google';
  card.dataset.state = 'pending';
  card.innerHTML = `
    <div class="nn-mission-top"><div class="nn-mission-icon nn-brand-google" aria-hidden="true">G</div><span class="nn-mission-state" data-mission-state>CHECKING</span></div>
    <h4>Connect Google</h4>
    <p data-mission-copy>Checking official Firebase Google provider state.</p>
    <button class="nn-google-connect" type="button" data-google-link disabled>Connect Google</button>
  `;
  const xCard = grid.querySelector('[data-mission="x"]');
  grid.insertBefore(card, xCard || null);
  const button = card.querySelector('[data-google-link]');
  button?.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user || button.disabled) return;
    delete card.dataset.authErrorCode;
    button.disabled = true;
    button.textContent = 'Connecting…';
    const copy = card.querySelector('[data-mission-copy]');
    if (copy) copy.textContent = 'Opening official Google account linking…';
    try {
      const result = await linkWithPopup(user, provider);
      await result.user.reload();
      paintGoogleMission(card, auth.currentUser || result.user);
      window.gtag?.('event', 'account_link', { provider: 'google', method: 'popup' });
    } catch (error) {
      console.warn('[NexusNova Google Link Popup]', safeAuthCode(error) || 'google-link-popup-failed');
      if (safeAuthCode(error) === 'auth/provider-already-linked') {
        try { await user.reload(); } catch (_) {}
        paintGoogleMission(card, auth.currentUser || user);
        return;
      }
      paintGoogleError(card, error);
    }
  });
  onAuthStateChanged(auth, async user => {
    if (user) {
      try { await user.reload(); } catch (_) {}
    }
    paintGoogleMission(card, auth.currentUser || user);
  });
}

setupGateway();
setupDashboard();

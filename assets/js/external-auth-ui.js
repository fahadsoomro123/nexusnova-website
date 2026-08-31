import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  TwitterAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
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
const AUTH_MARKER = 'nexusnova_auth_seen_v1';
const REFERRAL_KEY = 'nexusnova_pending_referral_v1';
const REFERRAL_RE = /^NVX-[A-Z0-9]{8,16}$/;
const DEFINITIVE_REFERRAL_ERRORS = new Set([
  'invalid-referral',
  'referral-not-found',
  'self-referral',
  'referral-window-expired',
  'referral-already-attached'
]);

const twitter = new TwitterAuthProvider();
const facebook = new FacebookAuthProvider();
const apple = new OAuthProvider('apple.com');
apple.addScope('email');
apple.addScope('name');

const providers = {
  x: {
    key: 'x',
    label: 'X',
    providerId: 'twitter.com',
    provider: twitter,
    mission: 'x',
    button: 'CONTINUE WITH X'
  },
  apple: {
    key: 'apple',
    label: 'Apple',
    providerId: 'apple.com',
    provider: apple,
    mission: 'apple',
    button: 'CONTINUE WITH APPLE'
  },
  facebook: {
    key: 'facebook',
    label: 'Facebook',
    providerId: 'facebook.com',
    provider: facebook,
    mission: 'facebook',
    button: 'CONTINUE WITH FACEBOOK'
  }
};

function cleanText(value, max = 180) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function providerErrorMessage(config, error, linking = false) {
  const code = String(error?.code || '');
  const label = config.label;
  const known = {
    'auth/operation-not-allowed': `${label} sign-in is not enabled on the Firebase project yet.`,
    'auth/popup-blocked': `Your browser blocked the ${label} sign-in popup. Allow popups and try again.`,
    'auth/popup-closed-by-user': `${label} sign-in was cancelled before it finished.`,
    'auth/cancelled-popup-request': 'Another provider sign-in window is already open.',
    'auth/network-request-failed': 'Network connection failed. Check your internet and try again.',
    'auth/account-exists-with-different-credential': `This account already uses another NexusNova sign-in method. Sign in with that method first, then connect ${label} from the dashboard.`,
    'auth/credential-already-in-use': `This ${label} identity is already connected to another NexusNova account.`,
    'auth/provider-already-linked': `${label} is already connected to this NexusNova account.`,
    'auth/requires-recent-login': `For security, sign out and sign in again before connecting ${label}.`
  };
  if (known[code]) return known[code];
  return cleanText(error?.message || (linking ? `${label} account linking failed.` : `${label} sign-in failed.`), 260);
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
  const name = cleanText(user.displayName || user.email?.split('@')[0] || 'NexusNova User', 80);
  const profile = {
    uid: user.uid,
    name,
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

async function attachPendingReferralForNewAccount(user, providerKey) {
  const code = currentReferral();
  if (!code || !user) return;
  try {
    const idToken = await user.getIdToken(true);
    await attachReferralCall({ code, idToken });
    clearReferral();
  } catch (error) {
    const errorCode = String(error?.code || '');
    console.warn(`[NexusNova ${providerKey} Referral]`, errorCode || 'attach-failed');
    if (DEFINITIVE_REFERRAL_ERRORS.has(errorCode)) clearReferral();
  }
}

function gatewayStatus(message, kind = '') {
  const status = document.querySelector('[data-status]');
  if (!status) return;
  status.textContent = message;
  if (kind) status.dataset.kind = kind;
  else delete status.dataset.kind;
}

function ensureStyles() {
  if (document.querySelector('style[data-nn-external-auth-style]')) return;
  const style = document.createElement('style');
  style.dataset.nnExternalAuthStyle = '1';
  style.textContent = `
    .nn-external-auth-wrap{display:grid;gap:9px;margin:12px 0 16px}
    .nn-external-auth-divider{display:flex;align-items:center;gap:10px;color:rgba(198,214,232,.66);font-size:10px;font-weight:800;letter-spacing:.11em;text-transform:uppercase}
    .nn-external-auth-divider::before,.nn-external-auth-divider::after{content:"";height:1px;flex:1;background:rgba(130,160,194,.18)}
    .nn-external-auth-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
    .nn-external-auth-btn{min-height:42px;border:1px solid rgba(126,160,198,.28);border-radius:12px;background:rgba(10,24,42,.72);color:inherit;font:inherit;font-size:11px;font-weight:850;letter-spacing:.04em;cursor:pointer}
    .nn-external-auth-btn:hover{border-color:rgba(104,219,255,.55);transform:translateY(-1px)}
    .nn-external-auth-btn:disabled{opacity:.58;cursor:wait;transform:none}
    .nn-external-auth-note{margin:0;color:var(--muted,#738399);font-size:11px;line-height:1.4;text-align:center}
    @media(max-width:560px){.nn-external-auth-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

async function signIn(config, button) {
  if (button.disabled) return;
  button.disabled = true;
  const original = button.textContent;
  button.textContent = `CONNECTING ${config.label.toUpperCase()}…`;
  gatewayStatus(`Opening official ${config.label} sign-in…`);
  try {
    const result = await signInWithPopup(auth, config.provider);
    const info = getAdditionalUserInfo(result);
    const ensured = await ensureProfile(result.user);
    if (ensured.created || info?.isNewUser === true) {
      await attachPendingReferralForNewAccount(result.user, config.key);
    }
    try { localStorage.setItem(AUTH_MARKER, '1'); } catch (_) {}
    window.gtag?.('event', info?.isNewUser ? 'sign_up' : 'login', { method: config.key });
    gatewayStatus(`${config.label} account verified. Opening your NexusNova dashboard…`, 'success');
    setTimeout(() => location.assign('account.html'), 120);
  } catch (error) {
    console.warn(`[NexusNova ${config.label} Auth]`, error?.code || 'provider-signin-failed');
    gatewayStatus(providerErrorMessage(config, error, false), 'error');
    button.disabled = false;
    button.textContent = original;
  }
}

function setupGateway() {
  const form = document.querySelector('[data-account-form]');
  if (!form || document.querySelector('[data-external-provider-auth]')) return;
  ensureStyles();
  const wrap = document.createElement('div');
  wrap.className = 'nn-external-auth-wrap';
  wrap.dataset.externalProviderAuth = '1';
  wrap.innerHTML = `
    <div class="nn-external-auth-divider"><span>other official providers</span></div>
    <div class="nn-external-auth-grid" data-external-provider-grid></div>
    <p class="nn-external-auth-note">Provider buttons use Firebase's official account flow. If a provider is not configured yet, NexusNova shows that honestly and does not create a fake connection.</p>
  `;
  const googleWrap = document.querySelector('[data-google-signin]');
  if (googleWrap?.parentNode) googleWrap.parentNode.insertBefore(wrap, googleWrap.nextSibling);
  else form.parentNode?.insertBefore(wrap, form);

  const grid = wrap.querySelector('[data-external-provider-grid]');
  for (const config of Object.values(providers)) {
    const button = document.createElement('button');
    button.className = 'nn-external-auth-btn';
    button.type = 'button';
    button.dataset.providerSignin = config.key;
    button.textContent = config.button;
    button.addEventListener('click', () => signIn(config, button));
    grid?.appendChild(button);
  }
}

function hasProvider(user, providerId) {
  return Array.isArray(user?.providerData) && user.providerData.some(item => item?.providerId === providerId);
}

function ensureAppleMission(grid) {
  let card = grid.querySelector('[data-mission="apple"]');
  if (card) return card;
  card = document.createElement('article');
  card.className = 'nn-mission';
  card.dataset.mission = 'apple';
  card.dataset.state = 'pending';
  card.innerHTML = `
    <div class="nn-mission-top"><div class="nn-mission-icon nn-brand-apple" aria-hidden="true">A</div><span class="nn-mission-state" data-mission-state>CHECKING</span></div>
    <h4>Connect Apple</h4><p data-mission-copy>Checking official Firebase Apple provider state.</p>
    <button type="button" data-provider-link="apple" disabled>Connect Apple</button>
  `;
  const facebookCard = grid.querySelector('[data-mission="facebook"]');
  grid.insertBefore(card, facebookCard || null);
  return card;
}

function prepareExistingMission(grid, key) {
  const config = providers[key];
  const card = grid.querySelector(`[data-mission="${config.mission}"]`);
  if (!card) return null;
  let button = card.querySelector(`[data-provider-link="${key}"]`);
  if (!button) {
    button = card.querySelector('button');
    if (button) button.dataset.providerLink = key;
  }
  if (button) {
    button.disabled = true;
    button.textContent = `Connect ${config.label}`;
  }
  return card;
}

function paintMission(config, card, user) {
  if (!card) return;
  const connected = hasProvider(user, config.providerId);
  const state = card.querySelector('[data-mission-state]');
  const copy = card.querySelector('[data-mission-copy]');
  const button = card.querySelector(`[data-provider-link="${config.key}"]`);
  card.dataset.state = connected ? 'complete' : 'ready';
  if (state) state.textContent = connected ? 'CONNECTED' : 'READY';
  if (copy) copy.textContent = connected
    ? `Official ${config.label} identity is linked to this Firebase account.`
    : `Connect your official ${config.label} identity to this existing NexusNova account.`;
  if (button) {
    button.hidden = connected;
    if (connected) {
      button.style.setProperty('display', 'none', 'important');
      button.textContent = `Connect ${config.label}`;
    } else {
      button.style.removeProperty('display');
      button.textContent = `Connect ${config.label}`;
    }
    button.disabled = !user || connected;
  }
}

async function linkProvider(config, card, button) {
  const user = auth.currentUser;
  if (!user || button.disabled) return;
  const copy = card.querySelector('[data-mission-copy]');
  const state = card.querySelector('[data-mission-state]');
  button.disabled = true;
  button.textContent = 'Connecting…';
  if (copy) copy.textContent = `Opening official ${config.label} account linking…`;
  try {
    await linkWithPopup(user, config.provider);
    await user.reload();
    paintMission(config, card, auth.currentUser || user);
    window.gtag?.('event', 'account_link', { provider: config.key });
  } catch (error) {
    console.warn(`[NexusNova ${config.label} Link]`, error?.code || 'provider-link-failed');
    card.dataset.state = 'error';
    if (state) state.textContent = 'NOT CONNECTED';
    if (copy) copy.textContent = providerErrorMessage(config, error, true);
    button.disabled = false;
    button.textContent = `Retry ${config.label}`;
  }
}

function setupDashboard() {
  const grid = document.querySelector('.nn-missions-grid');
  if (!grid) return;
  const cards = {
    x: prepareExistingMission(grid, 'x'),
    apple: ensureAppleMission(grid),
    facebook: prepareExistingMission(grid, 'facebook')
  };
  for (const [key, card] of Object.entries(cards)) {
    const config = providers[key];
    const button = card?.querySelector(`[data-provider-link="${key}"]`);
    button?.addEventListener('click', () => linkProvider(config, card, button));
  }
  onAuthStateChanged(auth, user => {
    for (const [key, card] of Object.entries(cards)) paintMission(providers[key], card, user);
  });
}

setupGateway();
setupDashboard();

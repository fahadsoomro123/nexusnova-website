import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  sendEmailVerification,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { telegramSessionCall, linkTelegramAccountCall } from './telegram-account-api.js';
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
const REFERRAL_KEY = 'nexusnova_pending_referral_v1';
const REFERRAL_RE = /^NVX-[A-Z0-9]{8,16}$/;
const TELEGRAM_SKIP_KEY = 'nexusnova_skip_telegram_autologin_v1';
const DEFINITIVE_REFERRAL_ERRORS = new Set([
  'invalid-referral',
  'referral-not-found',
  'self-referral',
  'referral-window-expired',
  'referral-already-attached'
]);

const form = document.querySelector('[data-account-form]');
const nameField = document.querySelector('[data-name-field]');
const confirmField = document.querySelector('[data-confirm-field]');
const submit = document.querySelector('[data-submit]');
const status = document.querySelector('[data-status]');
const legal = document.querySelector('[data-register-legal]');
const success = document.querySelector('[data-success]');
const successCopy = document.querySelector('[data-success-copy]');
const resend = document.querySelector('[data-resend]');
const referralPanel = document.querySelector('[data-referral-panel]');
const referralCodeEl = document.querySelector('[data-referral-code]');
const referralState = document.querySelector('[data-referral-state]');
const telegramPanel = document.querySelector('[data-telegram-panel]');
const telegramPhoto = document.querySelector('[data-telegram-photo]');
const telegramName = document.querySelector('[data-telegram-name]');
const telegramUsername = document.querySelector('[data-telegram-username]');
const telegramState = document.querySelector('[data-telegram-state]');
const telegramCopy = document.querySelector('[data-telegram-copy]');
const modeButtons = [...document.querySelectorAll('[data-mode]')];
let mode = 'register';
let pendingReferral = '';
let telegramContext = null;
let telegramBootstrapPromise = Promise.resolve(null);

function telegramLaunchKey() {
  const authDate = String(window.NexusNovaTelegram?.getAuthDate?.() || window.NexusNovaTelegram?.authDate || '').trim();
  return authDate ? `tg:${authDate}` : '';
}

function telegramAutoLoginSkippedForCurrentLaunch() {
  let stored = '';
  try { stored = sessionStorage.getItem(TELEGRAM_SKIP_KEY) || ''; } catch (_) {}
  if (!stored) return false;
  if (stored === '1') {
    try { sessionStorage.removeItem(TELEGRAM_SKIP_KEY); } catch (_) {}
    return false;
  }
  const current = telegramLaunchKey();
  if (current && stored === current) return true;
  try { sessionStorage.removeItem(TELEGRAM_SKIP_KEY); } catch (_) {}
  return false;
}

function paintTelegram(user, state, copy) {
  if (!telegramPanel || !user) return;
  telegramPanel.hidden = false;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Telegram user';
  if (telegramName) telegramName.textContent = fullName;
  if (telegramUsername) telegramUsername.textContent = user.username ? `@${user.username} • ID ${user.id}` : `Telegram ID ${user.id}`;
  if (telegramState) telegramState.textContent = state;
  if (telegramCopy) telegramCopy.textContent = copy;
  if (telegramPhoto) {
    telegramPhoto.hidden = !user.photoUrl;
    if (user.photoUrl) {
      telegramPhoto.src = user.photoUrl;
      telegramPhoto.alt = `${fullName} Telegram profile`;
    } else {
      telegramPhoto.removeAttribute('src');
    }
  }
}

function telegramErrorMessage(error) {
  const code = String(error?.code || '');
  const detail = String(error?.message || '').trim();
  if (code.includes('already-exists')) return 'This Telegram account is already linked to another NexusNova account.';
  if (code.includes('failed-precondition')) return detail || 'Telegram account service needs configuration.';
  if (code.includes('permission-denied')) return detail || 'Telegram verification expired. Close and reopen the Mini App.';
  if (code.includes('unavailable') || code.includes('network')) return detail || 'Telegram account service is unavailable.';
  return detail || 'Telegram linking could not finish. Your email account remains available.';
}

async function bootstrapTelegram() {
  const bridge = window.NexusNovaTelegram;
  if (!bridge?.isAvailable) return null;
  const detected = bridge.getUser();
  paintTelegram(detected, 'VERIFYING', 'Checking this Telegram launch securely…');

  try {
    const response = await telegramSessionCall({ initData: bridge.getInitData() });
    const result = response?.data || {};
    if (!result.user?.id) throw new Error('Verified Telegram user is missing.');
    telegramContext = { initData: bridge.getInitData(), linked: result.linked === true, user: result.user };
    paintTelegram(
      result.user,
      result.linked ? 'VERIFIED + LINKED' : 'VERIFIED',
      result.linked
        ? 'Telegram identity verified. Signing in to its linked NexusNova account…'
        : 'Telegram identity verified. Create an account or sign in below to link it.'
    );

    if (result.linked) {
      if (!result.customToken) {
        paintTelegram(result.user, 'LINKED • TOKEN MISSING', 'Telegram is linked, but the backend did not return a Firebase sign-in token.');
        setStatus('Telegram is linked, but automatic sign-in could not receive a Firebase token.', 'error');
        return telegramContext;
      }
      if (typeof auth.authStateReady === 'function') await auth.authStateReady();
      const skipAutoLogin = telegramAutoLoginSkippedForCurrentLaunch();
      if (!auth.currentUser && !skipAutoLogin) {
        setStatus('Telegram account recognized. Signing you in automatically…');
        const credential = await signInWithCustomToken(auth, result.customToken);
        try { sessionStorage.removeItem(TELEGRAM_SKIP_KEY); } catch (_) {}
        await ensureProfile(credential.user);
        window.gtag?.('event', 'login', { method: 'telegram_mini_app' });
        setTimeout(() => location.assign('account.html'), 150);
      } else if (skipAutoLogin) {
        paintTelegram(result.user, 'SIGNED OUT', 'You signed out during this Telegram launch. Reopen the Mini App from the bot to sign in automatically again.');
      }
    }
    return telegramContext;
  } catch (error) {
    console.warn('[NexusNova Telegram]', error?.code || 'verification-failed');
    const message = telegramErrorMessage(error);
    paintTelegram(detected, 'AUTO-LOGIN FAILED', message);
    setStatus(`Telegram automatic sign-in failed: ${message}`, 'error');
    return null;
  }
}

async function linkTelegramForUser(user) {
  const context = await telegramBootstrapPromise;
  if (!context?.initData || !user) return { linked: false, message: '' };
  try {
    const idToken = await user.getIdToken(true);
    const response = await linkTelegramAccountCall({ initData: context.initData, idToken });
    const verifiedUser = response?.data?.user || context.user;
    telegramContext = { ...context, linked: true, user: verifiedUser };
    paintTelegram(verifiedUser, 'LINKED', 'Telegram and NexusNova now use the same secure account.');
    window.gtag?.('event', 'telegram_account_linked', { source: 'mini_app' });
    return { linked: true, message: 'Telegram account linked securely.' };
  } catch (error) {
    console.warn('[NexusNova Telegram]', error?.code || 'link-failed');
    const message = telegramErrorMessage(error);
    paintTelegram(context.user, 'LINK NOT COMPLETED', message);
    return { linked: false, message };
  }
}

function cleanName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 80);
}

function cleanReferral(value) {
  const code = String(value || '').trim().toUpperCase();
  return REFERRAL_RE.test(code) ? code : '';
}

function setStatus(message, kind = '') {
  if (!status) return;
  status.textContent = message;
  if (kind) status.dataset.kind = kind;
  else delete status.dataset.kind;
}

function setReferralState(message, good = false) {
  if (!referralState) return;
  referralState.textContent = message;
  referralState.style.color = good ? '#57e2b7' : '';
}

function rememberReferral(code) {
  pendingReferral = cleanReferral(code);
  try {
    if (pendingReferral) localStorage.setItem(REFERRAL_KEY, pendingReferral);
    else localStorage.removeItem(REFERRAL_KEY);
  } catch (_) {}
}

function loadReferral() {
  const fromUrl = cleanReferral(new URLSearchParams(location.search).get('ref'));
  let stored = '';
  try { stored = cleanReferral(localStorage.getItem(REFERRAL_KEY)); } catch (_) {}
  rememberReferral(fromUrl || stored);
  if (!pendingReferral) return;
  referralPanel.hidden = false;
  referralCodeEl.textContent = pendingReferral;
  setReferralState('READY', true);
  window.gtag?.('event', 'referral_landing', { source: 'nexusnova_referral' });
}

function clearReferral() {
  pendingReferral = '';
  try { localStorage.removeItem(REFERRAL_KEY); } catch (_) {}
}

async function ensureProfile(user, requestedName = '') {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() || {};
  const name = cleanName(requestedName || user.displayName || user.email?.split('@')[0] || 'NexusNova User');
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
  return profile;
}

async function attachReferral(user) {
  const code = pendingReferral;
  if (!code || !user) return { attached: false, message: '' };
  const idToken = await user.getIdToken(true);
  const result = await attachReferralCall({ code, idToken });
  clearReferral();
  setReferralState(result?.attached ? 'ATTACHED' : 'CHECKED', result?.attached === true);
  if (result?.attached) window.gtag?.('event', 'referral_attached', { source: 'website_signup' });
  return {
    attached: result?.attached === true,
    message: String(result?.message || 'Referral attribution checked securely.')
  };
}

async function tryAttachReferral(user) {
  if (!pendingReferral) return { attached: false, message: '' };
  try {
    return await attachReferral(user);
  } catch (error) {
    console.warn('[NexusNova Referral]', error?.code || 'attach-failed');
    if (DEFINITIVE_REFERRAL_ERRORS.has(String(error?.code || ''))) {
      clearReferral();
      setReferralState('NOT ATTACHED');
      return { attached: false, message: String(error?.message || 'Referral could not be attached.') };
    }
    setReferralState('RETRY NEEDED');
    return {
      attached: false,
      message: 'Your account is ready, but secure referral attribution could not finish yet. Sign in again to retry the saved invite.'
    };
  }
}

function firebaseMessage(error) {
  const code = String(error?.code || '');
  const known = {
    'auth/email-already-in-use': 'An account already exists with this email. Use Sign In.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/user-not-found': 'Email or password is incorrect.',
    'auth/wrong-password': 'Email or password is incorrect.',
    'auth/weak-password': 'Choose a stronger password.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
    'auth/network-request-failed': 'Network connection failed. Check your internet and try again.'
  };
  if (known[code]) return known[code];
  if (code.includes('permission-denied')) return 'Secure profile setup was blocked. Please retry or sign in again.';
  return String(error?.message || 'Authentication failed.').replace(/^Firebase:\s*/i, '');
}

function setMode(next) {
  mode = next === 'signin' ? 'signin' : 'register';
  modeButtons.forEach(button => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  nameField.hidden = mode !== 'register';
  confirmField.hidden = mode !== 'register';
  form.elements.name.required = mode === 'register';
  form.elements.confirmPassword.required = mode === 'register';
  form.elements.password.autocomplete = mode === 'register' ? 'new-password' : 'current-password';
  form.elements.password.minLength = mode === 'register' ? 10 : 6;
  submit.textContent = mode === 'register' ? 'CREATE NEXUSNOVA ACCOUNT' : 'SIGN IN TO NEXUSNOVA';
  legal.hidden = mode !== 'register';
  success.classList.remove('show');
  setStatus(mode === 'register'
    ? 'Create an account with email and password. A verification email will be sent after registration.'
    : 'Sign in with the same email and password used in the NexusNova app.');
}

modeButtons.forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));

form?.addEventListener('submit', async event => {
  event.preventDefault();
  if (submit.disabled) return;
  const data = new FormData(form);
  const email = String(data.get('email') || '').trim();
  const password = String(data.get('password') || '');
  const name = cleanName(data.get('name'));
  const confirmPassword = String(data.get('confirmPassword') || '');

  if (!email) return setStatus('Enter your email address.', 'error');
  if (mode === 'register') {
    if (!name) return setStatus('Enter your name.', 'error');
    if (password.length < 10) return setStatus('Use a password with at least 10 characters.', 'error');
    if (password !== confirmPassword) return setStatus('Passwords do not match.', 'error');
  } else if (password.length < 6) {
    return setStatus('Enter your account password.', 'error');
  }

  submit.disabled = true;
  setStatus(mode === 'register' ? 'Creating your NexusNova account…' : 'Signing in…');

  try {
    if (mode === 'register') {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const user = credential.user;
      try { sessionStorage.removeItem(TELEGRAM_SKIP_KEY); } catch (_) {}
      await updateProfile(user, { displayName: name });
      await ensureProfile(user, name);
      await sendEmailVerification(user);
      const referralResult = await tryAttachReferral(user);
      const telegramResult = await linkTelegramForUser(user);
      window.gtag?.('event', 'sign_up', { method: 'email' });

      const setupMessages = [referralResult.message, telegramResult.message].filter(Boolean).join(' ');
      successCopy.textContent = `Check your inbox and verify your email. ${setupMessages} Use this same email and password in the NexusNova app.`.replace(/\s+/g, ' ').trim();
      success.classList.add('show');
      form.hidden = true;
    } else {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const user = credential.user;
      try { sessionStorage.removeItem(TELEGRAM_SKIP_KEY); } catch (_) {}
      await ensureProfile(user);
      const referralResult = await tryAttachReferral(user);
      const telegramResult = await linkTelegramForUser(user);
      window.gtag?.('event', 'login', { method: 'email' });
      const verify = user.emailVerified ? 'Email verified.' : 'Email not verified yet.';
      const connected = [referralResult.message, telegramResult.message].filter(Boolean).join(' ') || 'Signed in to your NexusNova account.';
      setStatus(`${verify} ${connected}`, 'success');
      setTimeout(() => location.assign('account.html'), 650);
    }
  } catch (error) {
    console.error('[NexusNova Account]', error?.code || 'error');
    setStatus(firebaseMessage(error), 'error');
  } finally {
    submit.disabled = false;
  }
});

resend?.addEventListener('click', async () => {
  if (!auth.currentUser) return;
  resend.disabled = true;
  try {
    await sendEmailVerification(auth.currentUser);
    resend.textContent = 'Verification sent';
  } catch (error) {
    successCopy.textContent = firebaseMessage(error);
  } finally {
    resend.disabled = false;
  }
});

onAuthStateChanged(auth, user => {
  if (!user) return;
  if (mode === 'signin') {
    setStatus(user.emailVerified ? 'You are already signed in.' : 'You are signed in; email verification is still pending.', 'success');
  }
});

loadReferral();
setMode('register');
telegramBootstrapPromise = bootstrapTelegram();

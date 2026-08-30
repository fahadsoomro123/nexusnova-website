import { getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const $ = selector => document.querySelector(selector);
const setText = (selector, value) => { const el = $(selector); if (el) el.textContent = String(value ?? ''); };
const setMission = (name, state, label, copy) => {
  const el = document.querySelector(`[data-mission="${name}"]`);
  if (!el) return;
  el.dataset.state = state;
  const badge = el.querySelector('[data-mission-state]');
  const text = el.querySelector('[data-mission-copy]');
  if (badge) badge.textContent = label;
  if (text && copy) text.textContent = copy;
};

function telegramLinkedFromPage() {
  const state = String($('[data-telegram-state]')?.textContent || '').trim().toUpperCase();
  return state === 'LINKED';
}

function paintSocialLocks() {
  setMission('x','locked','OAUTH REQUIRED','Official X account linking will activate only after verified OAuth configuration. No reward is tied to likes, follows, replies or reposts.');
  setMission('facebook','locked','CONFIG REQUIRED','Facebook connection stays locked until an official Meta connection can be verified.');
  setMission('instagram','locked','CONFIG REQUIRED','Instagram connection stays locked until a supported Meta/Instagram verification flow is available.');
}

function paintHalvingUnavailable() {
  setText('[data-web-halving-state]','LIVE DATA NOT EXPOSED YET');
  setText('[data-web-halving-copy]','The website will not invent a stage, rate or countdown. Real halving data will appear here only after a trusted web-readable source is connected.');
}

async function paintUser(user) {
  const apps = getApps();
  if (!apps.length || !user) return;
  const db = getFirestore(apps[0]);

  setMission(
    'email',
    user.emailVerified ? 'done' : 'pending',
    user.emailVerified ? 'VERIFIED' : 'VERIFY EMAIL',
    user.emailVerified ? 'Your Firebase email is verified.' : 'Verify your email before value-bearing rewards or mining eligibility.'
  );

  try {
    const snap = await getDoc(doc(db,'users',user.uid));
    const profile = snap.exists() ? (snap.data() || {}) : {};
    const balance = Number(profile.balance);
    if (Number.isFinite(balance) && balance >= 0) {
      const value = $('[data-web-nvx-balance]');
      if (value) value.innerHTML = `${balance.toFixed(4)} <small>NVX</small>`;
      setText('[data-web-nvx-note]','Read-only balance from your current Firebase profile. This page does not mint or change NVX.');
    } else {
      const value = $('[data-web-nvx-balance]');
      if (value) value.innerHTML = `— <small>NVX</small>`;
      setText('[data-web-nvx-note]','A valid server-backed balance is not available yet. No placeholder balance is shown.');
    }

    const name = String(profile.name || user.displayName || '').trim();
    setMission(
      'profile',
      name ? 'done' : 'pending',
      name ? 'COMPLETE' : 'ADD NAME',
      name ? 'Your NexusNova profile has a display name.' : 'Add a real display name to complete the basic profile milestone.'
    );

    const linkedTelegram = profile.telegram?.linked === true;
    setMission(
      'telegram',
      linkedTelegram ? 'done' : 'pending',
      linkedTelegram ? 'CONNECTED' : 'CONNECT',
      linkedTelegram ? 'Telegram is server-linked to this NexusNova identity.' : 'Open the account from the official Telegram Mini App to verify and link Telegram.'
    );
  } catch (error) {
    console.warn('[NexusNova Web App]', error?.code || error);
    setText('[data-web-nvx-note]','Secure account data could not be loaded. No fallback or fake value was substituted.');
  }
}

function syncTelegramFromExistingDashboard() {
  if (telegramLinkedFromPage()) {
    setMission('telegram','done','CONNECTED','Telegram is server-linked to this NexusNova identity.');
  }
}

function boot() {
  paintSocialLocks();
  paintHalvingUnavailable();
  const apps = getApps();
  if (!apps.length) return;
  const auth = getAuth(apps[0]);
  onAuthStateChanged(auth, user => {
    if (user) paintUser(user);
  });

  const tgState = $('[data-telegram-state]');
  if (tgState && 'MutationObserver' in window) {
    new MutationObserver(syncTelegramFromExistingDashboard).observe(tgState,{childList:true,subtree:true,characterData:true});
  }
  syncTelegramFromExistingDashboard();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
else boot();

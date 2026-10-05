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

function injectMining3DStyles() {
  if (document.querySelector('[data-nvx-3d-style]')) return;
  const style = document.createElement('style');
  style.dataset.nvx3dStyle = '';
  style.textContent = `
    .nn-mining-command-stage{display:grid;grid-template-columns:minmax(0,1.28fr) minmax(270px,.72fr);gap:12px;align-items:stretch;margin-bottom:10px;perspective:1300px}
    .nn-mining-command-stage .nn-webapp-overview{grid-template-columns:1fr;gap:10px;margin:0}
    .nn-mining-command-stage .nn-nvx-console,.nn-mining-command-stage .nn-halving-console{min-height:0;transform:translateZ(0);box-shadow:0 18px 35px rgba(9,17,43,.20),inset 0 1px 0 rgba(255,255,255,.10)}
    .nn-nvx-3d{position:relative;min-height:264px;overflow:hidden;border:1px solid rgba(117,105,255,.34);border-radius:22px;background:radial-gradient(circle at 50% 34%,rgba(94,77,255,.30),transparent 30%),radial-gradient(circle at 50% 76%,rgba(0,211,227,.12),transparent 34%),linear-gradient(155deg,#0a1022 0%,#121334 48%,#080d1c 100%);box-shadow:0 22px 48px rgba(21,24,70,.28),inset 0 1px 0 rgba(255,255,255,.09);color:#fff;transform:rotateY(-2deg);transform-style:preserve-3d;isolation:isolate}
    .nn-nvx-3d:before{content:"";position:absolute;inset:0;background:linear-gradient(120deg,rgba(255,255,255,.10),transparent 18%,transparent 76%,rgba(122,91,255,.10));pointer-events:none}
    .nn-nvx-3d:after{content:"";position:absolute;width:190px;height:190px;left:50%;top:43%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,rgba(76,232,255,.20),rgba(92,76,255,.11) 40%,transparent 72%);filter:blur(8px);z-index:-1}
    .nn-nvx-3d-head{position:relative;z-index:4;display:flex;justify-content:space-between;gap:10px;padding:14px 15px 0}.nn-nvx-3d-head span{color:#8ccfff;font-size:.52rem;font-weight:950;letter-spacing:.13em}.nn-nvx-3d-head b{padding:5px 7px;border:1px solid rgba(98,235,201,.24);border-radius:999px;background:rgba(38,166,135,.09);color:#72e9c7;font-size:.47rem;letter-spacing:.07em}
    .nn-nvx-core-stage{position:relative;height:145px;display:grid;place-items:center;transform-style:preserve-3d}
    .nn-nvx-orbit{position:absolute;left:50%;top:50%;border:1px solid rgba(126,150,255,.38);border-radius:50%;transform-style:preserve-3d}.nn-nvx-orbit.a{width:156px;height:76px;transform:translate(-50%,-50%) rotateX(68deg) rotateZ(12deg);box-shadow:0 0 28px rgba(85,110,255,.12)}.nn-nvx-orbit.b{width:130px;height:130px;transform:translate(-50%,-50%) rotateY(66deg) rotateZ(-18deg);border-color:rgba(84,226,255,.30)}.nn-nvx-orbit.c{width:108px;height:108px;transform:translate(-50%,-50%) rotateX(72deg) rotateY(18deg);border-color:rgba(173,99,255,.32)}
    .nn-nvx-core{position:relative;z-index:3;width:84px;height:84px;display:grid;place-items:center;border-radius:28px;background:linear-gradient(145deg,#7562ff 0%,#4a42d8 38%,#08b6db 100%);box-shadow:0 18px 34px rgba(69,70,220,.40),0 0 44px rgba(56,207,255,.16),inset 0 1px 1px rgba(255,255,255,.52),inset 0 -12px 20px rgba(2,5,24,.28);transform:rotateX(10deg) rotateY(-12deg) translateZ(24px)}
    .nn-nvx-core:before{content:"";position:absolute;inset:8px;border-radius:22px;border:1px solid rgba(255,255,255,.22);background:linear-gradient(145deg,rgba(255,255,255,.16),transparent 42%)}.nn-nvx-core strong{position:relative;font-size:1.35rem;letter-spacing:-.06em;text-shadow:0 3px 12px rgba(0,0,0,.35)}
    .nn-nvx-3d-info{position:relative;z-index:4;padding:0 15px 14px}.nn-nvx-3d-info small{display:block;color:#8696b6;font-size:.5rem;font-weight:900;letter-spacing:.12em}.nn-nvx-3d-balance{margin-top:3px;color:#fff;font:900 1.3rem/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:-.045em}.nn-nvx-3d-copy{margin-top:7px;color:#aab5cb;font-size:.61rem;line-height:1.4}.nn-nvx-3d-badges{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px}.nn-nvx-3d-badges span{padding:5px 7px;border:1px solid rgba(255,255,255,.10);border-radius:999px;background:rgba(255,255,255,.045);color:#c7d2e7;font-size:.46rem;font-weight:850;letter-spacing:.04em}
    @media(min-width:901px){.nn-nvx-orbit.a{animation:nnOrbitA 13s linear infinite}.nn-nvx-orbit.b{animation:nnOrbitB 16s linear infinite}.nn-nvx-orbit.c{animation:nnOrbitC 19s linear infinite}}
    @keyframes nnOrbitA{to{transform:translate(-50%,-50%) rotateX(68deg) rotateZ(372deg)}}@keyframes nnOrbitB{to{transform:translate(-50%,-50%) rotateY(66deg) rotateZ(342deg)}}@keyframes nnOrbitC{to{transform:translate(-50%,-50%) rotateX(72deg) rotateY(378deg)}}
    @media(max-width:900px){.nn-mining-command-stage{grid-template-columns:1fr}.nn-mining-command-stage .nn-webapp-overview{grid-template-columns:1fr 1fr}.nn-nvx-3d{min-height:238px;transform:none}.nn-nvx-core-stage{height:125px}}
    @media(max-width:620px){.nn-mining-command-stage .nn-webapp-overview{grid-template-columns:1fr}.nn-nvx-3d{min-height:225px;border-radius:18px}.nn-nvx-core-stage{height:118px}.nn-nvx-core{width:76px;height:76px;border-radius:25px}.nn-nvx-orbit.a{width:140px}.nn-nvx-orbit.b{width:116px;height:116px}.nn-nvx-orbit.c{width:96px;height:96px}}
    @media(prefers-reduced-motion:reduce){.nn-nvx-orbit{animation:none!important}.nn-nvx-3d{transform:none}}
  `;
  document.head.appendChild(style);
}

function enhanceMiningConsole() {
  const overview = $('.nn-webapp-overview');
  if (!overview || overview.closest('.nn-mining-command-stage')) return;
  injectMining3DStyles();

  const stage = document.createElement('div');
  stage.className = 'nn-mining-command-stage';
  overview.parentNode.insertBefore(stage, overview);
  stage.appendChild(overview);

  const visual = document.createElement('aside');
  visual.className = 'nn-nvx-3d';
  visual.setAttribute('aria-label','NVX mining visual — real account data only');
  visual.innerHTML = `
    <div class="nn-nvx-3d-head"><span>NVX MINING CORE // 3D</span><b>REAL STATE ONLY</b></div>
    <div class="nn-nvx-core-stage" aria-hidden="true">
      <i class="nn-nvx-orbit a"></i><i class="nn-nvx-orbit b"></i><i class="nn-nvx-orbit c"></i>
      <div class="nn-nvx-core"><strong>NVX</strong></div>
    </div>
    <div class="nn-nvx-3d-info">
      <small>FIREBASE-LINKED BALANCE</small>
      <div class="nn-nvx-3d-balance" data-nvx-3d-balance>— NVX</div>
      <div class="nn-nvx-3d-copy">Premium mining presentation without invented rate, stage or countdown. Mining remains a manual user action.</div>
      <div class="nn-nvx-3d-badges"><span>MANUAL SESSION</span><span>NO AUTO-START</span><span>NO FAKE RATE</span></div>
    </div>`;
  stage.appendChild(visual);
}

function paint3DBalance(value) {
  const el = $('[data-nvx-3d-balance]');
  if (!el) return;
  el.textContent = Number.isFinite(value) && value >= 0 ? `${value.toFixed(4)} NVX` : '— NVX';
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
      paint3DBalance(balance);
      setText('[data-web-nvx-note]','Read-only balance from your current Firebase profile. This page does not mint or change NVX.');
    } else {
      const value = $('[data-web-nvx-balance]');
      if (value) value.innerHTML = `— <small>NVX</small>`;
      paint3DBalance(NaN);
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
    paint3DBalance(NaN);
    setText('[data-web-nvx-note]','Secure account data could not be loaded. No fallback or fake value was substituted.');
  }
}

function syncTelegramFromExistingDashboard() {
  if (telegramLinkedFromPage()) {
    setMission('telegram','done','CONNECTED','Telegram is server-linked to this NexusNova identity.');
  }
}

function boot() {
  enhanceMiningConsole();
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

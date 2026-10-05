import { getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';

const ENDPOINT = 'https://nexusnova-telegram-bot.fahadsoomro123.workers.dev/api/account/eligibility';
const WAIT_MS = 5000;

const mission = document.querySelector('[data-mission="email"]');
if (mission) boot();

async function boot() {
  const app = await waitForFirebaseApp();
  if (!app) return lockValueActions('eligibility-unavailable');
  const auth = getAuth(app);
  onAuthStateChanged(auth, user => {
    if (!user) {
      lockValueActions('signed-out');
      return;
    }
    refreshEligibility(user).catch(error => {
      console.warn('[NexusNova eligibility]', error?.code || error?.message || error);
      lockValueActions('eligibility-unavailable');
      paintMission('pending', 'CHECK UNAVAILABLE', 'Server eligibility could not be verified. Value-bearing actions remain unavailable until the check succeeds.');
    });
  });
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

async function refreshEligibility(user) {
  const idToken = await user.getIdToken(true);
  const response = await fetch(ENDPOINT, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`,
      Accept: 'application/json'
    },
    cache: 'no-store',
    credentials: 'omit',
    referrerPolicy: 'no-referrer'
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result?.ok !== true) {
    const error = new Error(result?.error || `Eligibility check failed (${response.status}).`);
    error.code = result?.code || `http-${response.status}`;
    throw error;
  }

  const eligible = result.eligibleForValueActions === true;
  const disposable = result?.emailRisk?.checked === true && result?.emailRisk?.disposable === true;
  const verified = result.emailVerified === true;
  document.documentElement.dataset.valueEligibility = eligible ? 'eligible' : 'blocked';
  document.documentElement.dataset.valueEligibilityReason = String(result.reason || '').slice(0, 80);

  if (!verified) {
    paintMission('pending', 'VERIFY EMAIL', 'Verify your Firebase email before any value-bearing reward or mining eligibility.');
  } else if (disposable) {
    paintMission('blocked', 'TEMP EMAIL BLOCKED', 'This verified email is from a known temporary-email domain. Value-bearing reward/mining actions stay unavailable; normal website tools remain public.');
  } else {
    paintMission('done', 'VERIFIED', 'Email is verified and the server-side eligibility check found no known temporary-email-domain match.');
  }

  applyValueActionState(eligible, result.reason || 'not-eligible');
}

function paintMission(state, label, copy) {
  if (!mission) return;
  mission.dataset.state = state;
  const badge = mission.querySelector('[data-mission-state]');
  const text = mission.querySelector('[data-mission-copy]');
  if (badge) badge.textContent = label;
  if (text) text.textContent = copy;
}

function lockValueActions(reason) {
  document.documentElement.dataset.valueEligibility = 'blocked';
  document.documentElement.dataset.valueEligibilityReason = reason;
  applyValueActionState(false, reason);
}

function applyValueActionState(eligible, reason) {
  document.querySelectorAll('[data-value-action]').forEach(control => {
    if ('disabled' in control) control.disabled = !eligible;
    control.setAttribute('aria-disabled', String(!eligible));
    control.dataset.eligibility = eligible ? 'eligible' : 'blocked';
    if (!eligible) control.title = `Unavailable: ${String(reason || 'eligibility-not-verified')}`;
    else control.removeAttribute('title');
  });
}

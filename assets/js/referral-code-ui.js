import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { getReferralCodeCall } from './referral-account-api.js';

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
const referralCard = document.querySelector('[data-referral-title]')?.closest('.dash-card');
let loadedUid = '';

if (referralCard && !referralCard.querySelector('[data-own-referral-code]')) {
  const state = document.createElement('div');
  state.className = 'dash-state';
  state.innerHTML = '<span>Your invite code</span><strong data-own-referral-code>CHECKING</strong>';

  const copyButton = document.createElement('button');
  copyButton.className = 'btn';
  copyButton.type = 'button';
  copyButton.textContent = 'COPY INVITE LINK';
  copyButton.hidden = true;
  copyButton.dataset.referralCopy = '1';

  const note = document.createElement('p');
  note.textContent = 'Your code is created and owned on the secure backend. Sharing a code does not issue a signup reward by itself.';
  note.dataset.referralCodeNote = '1';

  referralCard.append(state, copyButton, note);

  const codeEl = state.querySelector('[data-own-referral-code]');
  let shareUrl = '';

  copyButton.addEventListener('click', async () => {
    if (!shareUrl) return;
    const original = copyButton.textContent;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const field = document.createElement('textarea');
        field.value = shareUrl;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        document.execCommand('copy');
        field.remove();
      }
      copyButton.textContent = 'COPIED';
    } catch (_) {
      copyButton.textContent = 'COPY FAILED';
    }
    setTimeout(() => { copyButton.textContent = original; }, 1600);
  });

  onAuthStateChanged(auth, async user => {
    if (!user) {
      loadedUid = '';
      codeEl.textContent = 'SIGN IN REQUIRED';
      copyButton.hidden = true;
      return;
    }
    if (loadedUid === user.uid) return;
    loadedUid = user.uid;
    codeEl.textContent = 'CHECKING';
    copyButton.hidden = true;

    try {
      const idToken = await user.getIdToken(true);
      const result = await getReferralCodeCall({ idToken });
      const code = String(result?.code || '').trim().toUpperCase();
      const url = String(result?.shareUrl || '').trim();
      if (!/^NVX-[A-Z0-9]{8,16}$/.test(code) || !url.startsWith('https://nexusnovatools.com/')) {
        throw new Error('Referral code response is invalid.');
      }
      codeEl.textContent = code;
      shareUrl = url;
      copyButton.hidden = false;
    } catch (error) {
      console.warn('[NexusNova Referral Code]', error?.code || 'load-failed');
      codeEl.textContent = 'UNAVAILABLE';
      shareUrl = '';
      copyButton.hidden = true;
    }
  });
}

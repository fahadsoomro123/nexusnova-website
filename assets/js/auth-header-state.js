import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBU75WYp5ioaMD1LrNcDyAvROFW2wrTil0',
  authDomain: 'nexusnova-6ade2.firebaseapp.com',
  projectId: 'nexusnova-6ade2',
  storageBucket: 'nexusnova-6ade2.firebasestorage.app',
  messagingSenderId: '49791194817',
  appId: '1:49791194817:web:07f28326e0f15979536640',
  measurementId: 'G-YLPFKWSS12'
};

const base = /\/(guides|articles|tech)\//.test(location.pathname) ? '../' : '';
const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app);

function initials(user) {
  const source = String(user?.displayName || user?.email || 'N').trim();
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function accountLabel(user) {
  const name = String(user?.displayName || '').trim();
  if (name) return name.split(/\s+/)[0].slice(0, 16);
  const email = String(user?.email || '').trim();
  return (email.split('@')[0] || 'Account').slice(0, 16);
}

function renderAccount(user) {
  const nav = document.querySelector('[data-nav]');
  if (!nav || nav.querySelector('[data-nn-account-menu]')) return;
  nav.querySelectorAll('.nn-nav-signin,.nn-nav-signup').forEach(el => el.remove());

  const menu = document.createElement('details');
  menu.className = 'nn-nav-account-menu';
  menu.dataset.nnAccountMenu = '';
  menu.innerHTML = `
    <summary aria-label="Open NexusNova account menu">
      <span class="nn-nav-avatar" aria-hidden="true">${initials(user)}</span>
      <span class="nn-nav-account-name">${accountLabel(user)}</span>
      <span class="nn-nav-chevron" aria-hidden="true">⌄</span>
    </summary>
    <div class="nn-nav-account-popover">
      <div class="nn-nav-account-meta">
        <strong>${String(user.displayName || 'NexusNova Account')}</strong>
        <small>${String(user.email || 'Signed in')}</small>
      </div>
      <a href="${base}account.html">Account dashboard</a>
      <a href="${base}account.html#profile">Profile & verification</a>
      <button type="button" data-nn-signout>Sign out</button>
    </div>`;
  nav.appendChild(menu);

  menu.querySelector('[data-nn-signout]')?.addEventListener('click', async () => {
    const button = menu.querySelector('[data-nn-signout]');
    if (button) { button.disabled = true; button.textContent = 'Signing out…'; }
    try {
      await signOut(auth);
      location.href = `${base}index.html`;
    } catch (_) {
      if (button) { button.disabled = false; button.textContent = 'Sign out'; }
    }
  });

  document.addEventListener('click', event => {
    if (!menu.open || menu.contains(event.target)) return;
    menu.open = false;
  });
}

onAuthStateChanged(auth, user => {
  if (user) renderAccount(user);
});

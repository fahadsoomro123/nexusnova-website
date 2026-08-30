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
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2) || 'N';
  return source.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2) || 'N';
}

function accountLabel(user) {
  const name = String(user?.displayName || '').trim();
  if (name) return name.split(/\s+/)[0].slice(0, 16);
  const email = String(user?.email || '').trim();
  return (email.split('@')[0] || 'Account').slice(0, 16);
}

function appendText(parent, tag, text, className = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  parent.appendChild(node);
  return node;
}

function renderAccount(user) {
  const nav = document.querySelector('[data-nav]');
  if (!nav || nav.querySelector('[data-nn-account-menu]')) return;
  nav.querySelectorAll('.nn-nav-signin,.nn-nav-signup').forEach(el => el.remove());

  const menu = document.createElement('details');
  menu.className = 'nn-nav-account-menu';
  menu.dataset.nnAccountMenu = '';

  const summary = document.createElement('summary');
  summary.setAttribute('aria-label', 'Open NexusNova account menu');
  appendText(summary, 'span', initials(user), 'nn-nav-avatar').setAttribute('aria-hidden', 'true');
  appendText(summary, 'span', accountLabel(user), 'nn-nav-account-name');
  appendText(summary, 'span', '⌄', 'nn-nav-chevron').setAttribute('aria-hidden', 'true');
  menu.appendChild(summary);

  const popover = document.createElement('div');
  popover.className = 'nn-nav-account-popover';
  const meta = document.createElement('div');
  meta.className = 'nn-nav-account-meta';
  appendText(meta, 'strong', String(user?.displayName || 'NexusNova Account').slice(0, 80));
  appendText(meta, 'small', String(user?.email || 'Signed in').slice(0, 160));
  popover.appendChild(meta);

  const dashboard = appendText(popover, 'a', 'Account dashboard');
  dashboard.href = `${base}account.html`;
  const profile = appendText(popover, 'a', 'Profile & verification');
  profile.href = `${base}account.html#profile`;
  const signout = appendText(popover, 'button', 'Sign out');
  signout.type = 'button';
  signout.dataset.nnSignout = '';
  menu.appendChild(popover);
  nav.appendChild(menu);

  signout.addEventListener('click', async () => {
    signout.disabled = true;
    signout.textContent = 'Signing out…';
    try {
      await signOut(auth);
      location.href = `${base}index.html`;
    } catch (_) {
      signout.disabled = false;
      signout.textContent = 'Sign out';
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

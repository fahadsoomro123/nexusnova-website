// NexusNova Telegram Mini App bridge.
// Raw Telegram initData is never trusted here; the backend validates it before auth.
(function bootstrapNexusNovaTelegram(global) {
  'use strict';

  const telegram = global.Telegram?.WebApp || null;
  const webView = global.Telegram?.WebView || null;
  const SESSION_INIT_DATA_KEY = 'nexusnova_telegram_init_data_v1';
  const SESSION_DISPLAY_USER_KEY = 'nexusnova_telegram_display_user_v2';
  const LEGACY_DISPLAY_USER_KEY = 'nexusnova_telegram_display_user_v1';
  const TELEGRAM_INIT_PARAMS_KEY = '__telegram__initParams';

  function cleanText(value, maxLength) {
    return String(value ?? '')
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .trim()
      .slice(0, maxLength);
  }

  function cleanPhotoUrl(value) {
    const text = cleanText(value, 2048);
    if (!text) return '';
    try {
      const url = new URL(text);
      return url.protocol === 'https:' ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  function normalizeUnsafeUser(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const id = String(raw.id ?? '').trim();
    const firstName = cleanText(raw.first_name ?? raw.firstName, 80);
    if (!/^\d{1,20}$/.test(id) || !firstName) return null;
    return Object.freeze({
      id,
      username: cleanText(raw.username, 64),
      firstName,
      lastName: cleanText(raw.last_name ?? raw.lastName, 80),
      photoUrl: cleanPhotoUrl(raw.photo_url ?? raw.photoUrl),
      languageCode: cleanText(raw.language_code ?? raw.languageCode, 16),
      isPremium: raw.is_premium === true || raw.isPremium === true,
      allowsWriteToPm: raw.allows_write_to_pm === true || raw.allowsWriteToPm === true
    });
  }

  function readStorage(key) {
    try {
      return global.sessionStorage?.getItem(key) || '';
    } catch (_) {
      return '';
    }
  }

  function writeStorage(key, value) {
    if (!value) return;
    try {
      global.sessionStorage?.setItem(key, value);
    } catch (_) {}
  }

  function removeStorage(key) {
    try {
      global.sessionStorage?.removeItem(key);
    } catch (_) {}
  }

  function readTelegramStoredInitData() {
    const stored = readStorage(TELEGRAM_INIT_PARAMS_KEY);
    if (!stored) return '';
    try {
      const parsed = JSON.parse(stored);
      return typeof parsed?.tgWebAppData === 'string' ? parsed.tgWebAppData : '';
    } catch (_) {
      return '';
    }
  }

  function readHashInitData() {
    try {
      const hash = String(global.location?.hash || '').replace(/^#/, '');
      if (!hash) return '';
      const params = new URLSearchParams(hash);
      return params.get('tgWebAppData') || '';
    } catch (_) {
      return '';
    }
  }

  function userFromInitData(value) {
    if (!value) return null;
    try {
      const raw = new URLSearchParams(value).get('user');
      if (!raw) return null;
      return normalizeUnsafeUser(JSON.parse(raw));
    } catch (_) {
      return null;
    }
  }

  function authDateFromInitData(value) {
    if (!value) return '';
    try {
      const raw = String(new URLSearchParams(value).get('auth_date') || '').trim();
      return /^\d{1,12}$/.test(raw) ? raw : '';
    } catch (_) {
      return '';
    }
  }

  function readStoredDisplayUser(authDate, baseUser) {
    if (!authDate || !baseUser?.id) return null;
    const stored = readStorage(SESSION_DISPLAY_USER_KEY);
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored);
      if (String(parsed?.authDate || '') !== authDate) {
        removeStorage(SESSION_DISPLAY_USER_KEY);
        return null;
      }
      const user = normalizeUnsafeUser(parsed?.user);
      if (!user || String(user.id) !== String(baseUser.id)) {
        removeStorage(SESSION_DISPLAY_USER_KEY);
        return null;
      }
      return user;
    } catch (_) {
      removeStorage(SESSION_DISPLAY_USER_KEY);
      return null;
    }
  }

  function writeDisplayUser(user, authDate) {
    if (!user?.id || !authDate) return;
    try {
      writeStorage(SESSION_DISPLAY_USER_KEY, JSON.stringify({
        authDate,
        user: {
          id: user.id,
          username: user.username || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          photoUrl: user.photoUrl || '',
          languageCode: user.languageCode || '',
          isPremium: user.isPremium === true,
          allowsWriteToPm: user.allowsWriteToPm === true
        }
      }));
    } catch (_) {}
  }

  function mergeDisplayUser(baseUser, cachedUser) {
    if (!baseUser) return null;
    if (!cachedUser || String(cachedUser.id || '') !== String(baseUser.id || '')) return baseUser;
    return Object.freeze({
      ...baseUser,
      username: baseUser.username || cachedUser.username || '',
      firstName: baseUser.firstName || cachedUser.firstName || '',
      lastName: baseUser.lastName || cachedUser.lastName || '',
      photoUrl: baseUser.photoUrl || cachedUser.photoUrl || '',
      languageCode: baseUser.languageCode || cachedUser.languageCode || '',
      isPremium: baseUser.isPremium === true || cachedUser.isPremium === true,
      allowsWriteToPm: baseUser.allowsWriteToPm === true || cachedUser.allowsWriteToPm === true
    });
  }

  const candidates = [
    ['webapp', typeof telegram?.initData === 'string' ? telegram.initData : ''],
    ['webview', typeof webView?.initParams?.tgWebAppData === 'string' ? webView.initParams.tgWebAppData : ''],
    ['hash', readHashInitData()],
    ['telegram-storage', readTelegramStoredInitData()],
    ['nexusnova-storage', readStorage(SESSION_INIT_DATA_KEY)]
  ];

  const selected = candidates.find(([, value]) => typeof value === 'string' && value.length > 0) || ['none', ''];
  const source = selected[0];
  const initData = selected[1];
  const authDate = authDateFromInitData(initData);

  if (initData) writeStorage(SESSION_INIT_DATA_KEY, initData);
  removeStorage(LEGACY_DISPLAY_USER_KEY);

  const liveUnsafeUser = normalizeUnsafeUser(telegram?.initDataUnsafe?.user);
  const signedDisplayUser = userFromInitData(initData);
  const baseUser = liveUnsafeUser || signedDisplayUser;
  const unsafeUser = mergeDisplayUser(baseUser, readStoredDisplayUser(authDate, baseUser));
  if (unsafeUser) writeDisplayUser(unsafeUser, authDate);

  const reason = !initData
    ? 'missing-init-data'
    : (!unsafeUser ? 'missing-user' : '');

  const available = Boolean(initData && unsafeUser);

  const bridge = Object.freeze({
    isAvailable: available,
    source,
    reason,
    authDate,
    platform: cleanText(telegram?.platform, 32),
    version: cleanText(telegram?.version, 24),
    user: unsafeUser,
    getInitData() {
      return available ? initData : '';
    },
    getUser() {
      return unsafeUser ? { ...unsafeUser } : null;
    },
    getAuthDate() {
      return authDate;
    },
    getDiagnostic() {
      return { available, source, reason, authDatePresent: Boolean(authDate), photoPresent: Boolean(unsafeUser?.photoUrl) };
    },
    close() {
      if (!telegram) return false;
      try {
        telegram.close();
        return true;
      } catch (_) {
        return false;
      }
    }
  });

  global.NexusNovaTelegram = bridge;

  if (available) {
    try { telegram?.ready(); } catch (_) {}
    try { telegram?.expand(); } catch (_) {}
    try { telegram?.setHeaderColor?.('#07111f'); } catch (_) {}
    try { telegram?.setBackgroundColor?.('#02050d'); } catch (_) {}
    document.documentElement.dataset.telegramMiniApp = 'true';
    document.documentElement.dataset.telegramInitSource = source;
    document.documentElement.style.setProperty(
      '--nexusnova-tg-platform',
      "'" + (bridge.platform || 'unknown') + "'"
    );
  }

  try {
    global.dispatchEvent(new CustomEvent('nexusnova:telegram-ready', {
      detail: {
        available,
        user: bridge.getUser(),
        source,
        reason,
        authDatePresent: Boolean(authDate),
        photoPresent: Boolean(unsafeUser?.photoUrl)
      }
    }));
  } catch (_) {}
})(window);

// Homepage-only NexusNova Android promotion loader. Kept isolated from Telegram auth behavior.
(()=>{
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  if(page!=='index.html') return;
  if(!document.querySelector('link[data-home-app-promo]')){
    const style=document.createElement('link');
    style.rel='stylesheet';
    style.href='assets/css/home-app-promo.css?v=20260830-2';
    style.dataset.homeAppPromo='';
    document.head.appendChild(style);
  }
  if(!document.querySelector('script[data-home-app-promo]')){
    const script=document.createElement('script');
    script.src='assets/js/home-app-promo.js?v=20260830-2';
    script.defer=true;
    script.dataset.homeAppPromo='';
    document.head.appendChild(script);
  }
})();

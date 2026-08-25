// NexusNova Telegram Mini App bridge.
// Raw initData is always verified by the backend before it is trusted for auth.
(function bootstrapNexusNovaTelegram(global) {
  'use strict';

  const telegram = global.Telegram?.WebApp || null;
  const SESSION_INIT_DATA_KEY = 'nexusnova_telegram_init_data_v1';

  function cleanText(value, maxLength) {
    return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength);
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
    const firstName = cleanText(raw.first_name, 80);
    if (!/^\d{1,20}$/.test(id) || !firstName) return null;
    return Object.freeze({
      id,
      username: cleanText(raw.username, 64),
      firstName,
      lastName: cleanText(raw.last_name, 80),
      photoUrl: cleanPhotoUrl(raw.photo_url),
      languageCode: cleanText(raw.language_code, 16),
      isPremium: raw.is_premium === true,
      allowsWriteToPm: raw.allows_write_to_pm === true
    });
  }

  function getStoredInitData() {
    try {
      return sessionStorage.getItem(SESSION_INIT_DATA_KEY) || '';
    } catch (_) {
      return '';
    }
  }

  function saveInitData(value) {
    if (!value) return;
    try {
      sessionStorage.setItem(SESSION_INIT_DATA_KEY, value);
    } catch (_) {}
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

  const liveInitData = typeof telegram?.initData === 'string' ? telegram.initData : '';
  if (liveInitData) saveInitData(liveInitData);

  // Telegram attaches initData to the initial Mini App page. Normal same-origin
  // navigation can lose that launch fragment, so reuse the signed raw string from
  // this WebView session. The backend still performs HMAC + freshness validation.
  const initData = liveInitData || getStoredInitData();
  const unsafeUser =
    normalizeUnsafeUser(telegram?.initDataUnsafe?.user) ||
    userFromInitData(initData);
  const available = Boolean(initData && unsafeUser);

  const bridge = Object.freeze({
    isAvailable: available,
    platform: cleanText(telegram?.platform, 32),
    version: cleanText(telegram?.version, 24),
    user: unsafeUser,
    getInitData() {
      return available ? initData : '';
    },
    getUser() {
      return unsafeUser ? { ...unsafeUser } : null;
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
    document.documentElement.style.setProperty('--nexusnova-tg-platform', "'" + (bridge.platform || 'unknown') + "'");
  }

  try {
    global.dispatchEvent(new CustomEvent('nexusnova:telegram-ready', {
      detail: { available, user: bridge.getUser() }
    }));
  } catch (_) {}
})(window);

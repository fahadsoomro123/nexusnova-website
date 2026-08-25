// NexusNova Telegram Mini App bridge.
// Raw Telegram initData is never trusted here; the backend validates it before auth.
(function bootstrapNexusNovaTelegram(global) {
  'use strict';

  const telegram = global.Telegram?.WebApp || null;
  const webView = global.Telegram?.WebView || null;
  const SESSION_INIT_DATA_KEY = 'nexusnova_telegram_init_data_v1';
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

  if (initData) writeStorage(SESSION_INIT_DATA_KEY, initData);

  const unsafeUser =
    normalizeUnsafeUser(telegram?.initDataUnsafe?.user) ||
    userFromInitData(initData);

  const reason = !initData
    ? 'missing-init-data'
    : (!unsafeUser ? 'missing-user' : '');

  const available = Boolean(initData && unsafeUser);

  const bridge = Object.freeze({
    isAvailable: available,
    source,
    reason,
    platform: cleanText(telegram?.platform, 32),
    version: cleanText(telegram?.version, 24),
    user: unsafeUser,
    getInitData() {
      return available ? initData : '';
    },
    getUser() {
      return unsafeUser ? { ...unsafeUser } : null;
    },
    getDiagnostic() {
      return { available, source, reason };
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
        reason
      }
    }));
  } catch (_) {}
})(window);

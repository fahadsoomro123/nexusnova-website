import { telegramSessionCall } from './telegram-account-api.js';

const telegramPhoto = document.querySelector('[data-telegram-photo]');
const telegramState = document.querySelector('[data-telegram-state]');
const MAX_AVATAR_ATTEMPTS = 5;
const AVATAR_RETRY_DELAYS_MS = [0, 700, 1600, 3200, 6000];
let attempts = 0;
let inFlight = false;
let succeeded = false;
let retryTimer = null;
let requestId = 0;

function isLinked() {
  return String(telegramState?.textContent || '').trim().toUpperCase() === 'LINKED';
}

function scheduleRetry() {
  if (succeeded || inFlight || attempts >= MAX_AVATAR_ATTEMPTS || retryTimer) return;
  const delay = AVATAR_RETRY_DELAYS_MS[Math.min(attempts, AVATAR_RETRY_DELAYS_MS.length - 1)] ?? 6000;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    refreshTelegramAvatar();
  }, delay);
}

function probeAvatar(url) {
  return new Promise(resolve => {
    if (!url) return resolve(null);
    const probe = new Image();
    probe.referrerPolicy = 'no-referrer';
    probe.onload = () => resolve(probe.naturalWidth > 0 && probe.naturalHeight > 0 ? probe : null);
    probe.onerror = () => resolve(null);
    probe.src = url;
  });
}

async function firstWorkingAvatar(candidates) {
  for (const candidate of candidates) {
    const url = String(candidate?.url || '').trim();
    if (!url) continue;
    const probe = await probeAvatar(url);
    if (probe) return { url, source: candidate.source };
  }
  return null;
}

async function refreshTelegramAvatar() {
  if (succeeded || inFlight || !telegramPhoto) return;
  if (!isLinked()) {
    scheduleRetry();
    return;
  }

  const bridge = window.NexusNovaTelegram;
  const initData = String(bridge?.getInitData?.() || '').trim();
  if (!bridge?.isAvailable || !initData) {
    scheduleRetry();
    return;
  }

  inFlight = true;
  attempts += 1;
  const currentRequest = ++requestId;

  try {
    const response = await telegramSessionCall({ initData });
    const serverUser = response?.data?.user || null;
    if (!response?.data?.linked || !serverUser?.id) return;

    // The server response is already backed by verified Telegram initData and the
    // linked identity mapping. Prefer the inline Bot API avatar, then the signed
    // proxy, then Telegram's launch photo URL. Do not require a second local-user
    // match because Telegram WebApp bridges can expose user data a little later.
    const selected = await firstWorkingAvatar([
      { url: serverUser.avatarDataUrl, source: 'inline' },
      { url: serverUser.avatarUrl, source: 'proxy' },
      { url: serverUser.photoUrl, source: 'telegram' }
    ]);
    if (!selected || currentRequest !== requestId) return;

    telegramPhoto.hidden = false;
    telegramPhoto.alt = `${[serverUser.firstName, serverUser.lastName].filter(Boolean).join(' ') || 'Telegram'} avatar`;
    telegramPhoto.referrerPolicy = 'no-referrer';
    telegramPhoto.src = selected.url;
    telegramPhoto.dataset.avatarSource = selected.source;
    succeeded = true;
  } catch (_) {
    // Existing dashboard fallback remains visible while a short retry sequence runs.
  } finally {
    inFlight = false;
    if (!succeeded) scheduleRetry();
  }
}

const observer = telegramState ? new MutationObserver(() => {
  if (isLinked()) {
    attempts = 0;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    refreshTelegramAvatar();
  }
}) : null;
observer?.observe(telegramState, { childList: true, characterData: true, subtree: true });

window.addEventListener('load', refreshTelegramAvatar, { once: true });
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !succeeded) refreshTelegramAvatar();
});
refreshTelegramAvatar();

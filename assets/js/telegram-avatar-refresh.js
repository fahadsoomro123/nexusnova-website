import { telegramSessionCall } from './telegram-account-api.js';

const telegramPhoto = document.querySelector('[data-telegram-photo]');
const telegramState = document.querySelector('[data-telegram-state]');
const MAX_AVATAR_ATTEMPTS = 3;
const AVATAR_RETRY_DELAYS_MS = [0, 1200, 3500];
let attempts = 0;
let inFlight = false;
let succeeded = false;
let retryTimer = null;
let requestId = 0;

function scheduleRetry() {
  if (succeeded || inFlight || attempts >= MAX_AVATAR_ATTEMPTS || retryTimer) return;
  const delay = AVATAR_RETRY_DELAYS_MS[attempts] ?? 3500;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    refreshTelegramAvatar();
  }, delay);
}

function probeAvatar(url) {
  return new Promise(resolve => {
    const probe = new Image();
    probe.referrerPolicy = 'no-referrer';
    probe.onload = () => resolve(probe.naturalWidth > 0 && probe.naturalHeight > 0 ? probe : null);
    probe.onerror = () => resolve(null);
    probe.src = url;
  });
}

async function refreshTelegramAvatar() {
  const bridge = window.NexusNovaTelegram;
  if (succeeded || inFlight || !telegramPhoto || !bridge?.isAvailable || !bridge.getInitData?.()) return;
  if (String(telegramState?.textContent || '').trim().toUpperCase() !== 'LINKED') return;

  inFlight = true;
  attempts += 1;
  const currentRequest = ++requestId;

  try {
    const response = await telegramSessionCall({ initData: bridge.getInitData() });
    const serverUser = response?.data?.user || null;
    const localUser = bridge.getUser?.() || null;
    const avatarUrl = String(serverUser?.avatarUrl || '').trim();

    if (!avatarUrl || !serverUser?.id || !localUser?.id ||
        String(serverUser.id) !== String(localUser.id)) return;

    const probe = await probeAvatar(avatarUrl);
    if (!probe || currentRequest !== requestId) return;

    telegramPhoto.hidden = false;
    telegramPhoto.alt = `${[serverUser.firstName, serverUser.lastName].filter(Boolean).join(' ') || 'Telegram'} avatar`;
    telegramPhoto.referrerPolicy = 'no-referrer';
    telegramPhoto.src = avatarUrl;
    succeeded = true;
  } catch (_) {
    // Existing dashboard fallback remains visible while a short retry sequence runs.
  } finally {
    inFlight = false;
    if (!succeeded) scheduleRetry();
  }
}

const observer = telegramState ? new MutationObserver(refreshTelegramAvatar) : null;
observer?.observe(telegramState, { childList: true, characterData: true, subtree: true });
refreshTelegramAvatar();

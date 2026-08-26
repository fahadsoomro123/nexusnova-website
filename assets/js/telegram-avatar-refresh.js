import { telegramSessionCall } from './telegram-account-api.js';

const telegramPhoto = document.querySelector('[data-telegram-photo]');
const telegramState = document.querySelector('[data-telegram-state]');
let attempted = false;
let requestId = 0;

async function refreshTelegramAvatar() {
  const bridge = window.NexusNovaTelegram;
  if (attempted || !telegramPhoto || !bridge?.isAvailable || !bridge.getInitData?.()) return;
  if (String(telegramState?.textContent || '').trim().toUpperCase() !== 'LINKED') return;

  attempted = true;
  const currentRequest = ++requestId;

  try {
    const response = await telegramSessionCall({ initData: bridge.getInitData() });
    const serverUser = response?.data?.user || null;
    const localUser = bridge.getUser?.() || null;
    const avatarUrl = String(serverUser?.avatarUrl || '').trim();

    if (!avatarUrl || !serverUser?.id || !localUser?.id ||
        String(serverUser.id) !== String(localUser.id)) return;

    const probe = new Image();
    probe.referrerPolicy = 'no-referrer';
    probe.onload = () => {
      if (currentRequest !== requestId || !probe.naturalWidth || !probe.naturalHeight) return;
      telegramPhoto.hidden = false;
      telegramPhoto.alt = `${[serverUser.firstName, serverUser.lastName].filter(Boolean).join(' ') || 'Telegram'} avatar`;
      telegramPhoto.referrerPolicy = 'no-referrer';
      telegramPhoto.src = avatarUrl;
    };
    probe.onerror = () => {};
    probe.src = avatarUrl;
  } catch (_) {
    // Existing dashboard fallback remains visible if the secure avatar service is unavailable.
  }
}

const observer = telegramState ? new MutationObserver(refreshTelegramAvatar) : null;
observer?.observe(telegramState, { childList: true, characterData: true, subtree: true });
refreshTelegramAvatar();

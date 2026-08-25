const TELEGRAM_BACKEND = 'https://nexusnova-telegram-bot.fahadsoomro123.workers.dev';
const TELEGRAM_REQUEST_TIMEOUT_MS = 10000;

async function request(endpoint, { initData, idToken = '' }) {
  const headers = { 'Content-Type': 'application/json' };
  if (idToken) headers.Authorization = `Bearer ${idToken}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TELEGRAM_REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${TELEGRAM_BACKEND}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ initData }),
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller.signal
    });
  } catch (error) {
    const timedOut = error?.name === 'AbortError';
    const wrapped = new Error(timedOut
      ? 'Telegram account service timed out. Please reopen the Mini App.'
      : 'Telegram account service is unreachable.');
    wrapped.code = timedOut ? 'timeout' : 'unavailable';
    throw wrapped;
  } finally {
    clearTimeout(timeout);
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false) {
    const error = new Error(result.error || 'Telegram account request failed.');
    error.code = result.code || `http-${response.status}`;
    throw error;
  }
  return result;
}

export async function telegramSessionCall({ initData }) {
  const data = await request('/api/telegram/session', { initData });
  return { data };
}

export async function linkTelegramAccountCall({ initData, idToken }) {
  if (!idToken) {
    const error = new Error('Sign in to NexusNova first.');
    error.code = 'unauthenticated';
    throw error;
  }
  const data = await request('/api/telegram/link', { initData, idToken });
  return { data };
}

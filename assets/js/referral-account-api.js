const REFERRAL_BACKEND = 'https://nexusnova-telegram-bot.fahadsoomro123.workers.dev';
const REFERRAL_REQUEST_TIMEOUT_MS = 10000;

export async function attachReferralCall({ code, idToken }) {
  return referralRequest({ code }, idToken);
}

export async function getReferralCodeCall({ idToken }) {
  return referralRequest({ action: 'code' }, idToken);
}

async function referralRequest(body, idToken) {
  if (!idToken) {
    const error = new Error('Sign in to NexusNova first.');
    error.code = 'unauthenticated';
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REFERRAL_REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${REFERRAL_BACKEND}/api/referral/attach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller.signal
    });
  } catch (error) {
    const timedOut = error?.name === 'AbortError';
    const wrapped = new Error(timedOut ? 'Referral service timed out. Please retry.' : 'Referral service is unreachable.');
    wrapped.code = timedOut ? 'timeout' : 'unavailable';
    throw wrapped;
  } finally {
    clearTimeout(timeout);
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result?.ok !== true) {
    const error = new Error(result?.error || 'Referral request failed.');
    error.code = result?.code || `http-${response.status}`;
    throw error;
  }
  return result;
}

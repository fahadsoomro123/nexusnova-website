// NexusNova Safepay webhook receiver for Cloudflare Workers
// Secrets must be configured as Worker environment variables, never committed.
// Required secret: SAFEPAY_SECRET_KEY
// Optional: SAFEPAY_ENV=sandbox|production (defaults to sandbox)

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  }
});

function getTrackerToken(payload) {
  const candidates = [
    payload?.tracker,
    payload?.data?.tracker,
    payload?.data?.tracker?.token,
    payload?.data?.payment?.tracker,
    payload?.payment?.tracker,
    payload?.resource?.tracker,
    payload?.object?.tracker,
    payload?.event?.tracker
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.startsWith('track_')) return value;
    if (value && typeof value === 'object' && typeof value.token === 'string' && value.token.startsWith('track_')) return value.token;
  }
  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return json({ ok: true, service: 'nexusnova-safepay-webhook', environment: env.SAFEPAY_ENV || 'sandbox' });
    }

    if (url.pathname !== '/api/safepay/webhook') {
      return json({ ok: false, error: 'not_found' }, 404);
    }

    if (request.method !== 'POST') {
      return json({ ok: false, error: 'method_not_allowed' }, 405);
    }

    if (!env.SAFEPAY_SECRET_KEY) {
      console.error('Missing SAFEPAY_SECRET_KEY');
      return json({ ok: false, error: 'server_not_configured' }, 503);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ ok: false, error: 'invalid_json' }, 400);
    }

    const tracker = getTrackerToken(payload);
    if (!tracker) {
      console.warn('Safepay webhook received without tracker token');
      return json({ ok: true, received: true, verified: false, reason: 'tracker_missing' });
    }

    const production = (env.SAFEPAY_ENV || 'sandbox').toLowerCase() === 'production';
    const apiHost = production ? 'https://api.getsafepay.com' : 'https://sandbox.api.getsafepay.com';

    try {
      // Re-fetch the tracker directly from Safepay before trusting any webhook payload.
      // This prevents a forged POST body from being treated as a successful payment.
      const verifyResponse = await fetch(`${apiHost}/reporter/api/v1/payments/${encodeURIComponent(tracker)}`, {
        method: 'GET',
        headers: {
          'x-sfpy-api-key': env.SAFEPAY_SECRET_KEY,
          'accept': 'application/json'
        }
      });

      const verifyBody = await verifyResponse.json().catch(() => ({}));
      if (!verifyResponse.ok) {
        console.error('Safepay tracker verification failed', verifyResponse.status, tracker);
        return json({ ok: false, error: 'tracker_verification_failed' }, 502);
      }

      const trackerData = verifyBody?.data?.tracker || verifyBody?.data || {};
      const state = trackerData?.state || null;
      const isPaid = state === 'TRACKER_ENDED';

      console.log(JSON.stringify({
        event: payload?.type || payload?.event || 'unknown',
        tracker,
        state,
        verified_paid: isPaid,
        environment: production ? 'production' : 'sandbox'
      }));

      // No client-controlled redirect or browser query parameter is trusted here.
      // A database/KV write can be added later when order persistence is enabled.
      return json({ ok: true, received: true, tracker, verified: true, paid: isPaid, state });
    } catch (error) {
      console.error('Safepay webhook worker error', error);
      return json({ ok: false, error: 'internal_error' }, 500);
    }
  }
};

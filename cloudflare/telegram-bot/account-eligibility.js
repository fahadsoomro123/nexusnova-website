import { disposableEmailRisk, duplicateAccountRisk } from './auth-abuse.js';

const FIREBASE_PROJECT_ID = 'nexusnova-6ade2';
const FIREBASE_API_KEY = 'AIzaSyBU75WYp5ioaMD1LrNcDyAvROFW2wrTil0';
const MAX_BEARER_LENGTH = 10_000;

class EligibilityError extends Error {
  constructor(status, code, publicMessage) {
    super(publicMessage);
    this.status = status;
    this.code = code;
    this.publicMessage = publicMessage;
  }
}

export async function accountEligibilityRequest(request, env = {}) {
  try {
    const account = await verifiedFirebaseAccount(request.headers.get('Authorization'));
    const emailRisk = disposableEmailRisk(account.email);
    const duplicateRisk = await duplicateAccountRisk(request, account, env).catch(error => {
      console.warn('Duplicate-account risk check degraded:', String(error?.message || error || 'unknown'));
      return { checked: false, reviewRequired: false, reason: 'signal-unavailable' };
    });
    const emailVerified = account.emailVerified === true;
    const disposable = emailRisk.checked === true && emailRisk.disposable === true;
    const duplicateReview = duplicateRisk.checked === true && duplicateRisk.reviewRequired === true;
    const eligibleForValueActions = emailVerified && !disposable && !duplicateReview;

    let reason = 'eligible';
    if (!emailVerified) reason = 'email-unverified';
    else if (disposable) reason = 'disposable-email';
    else if (duplicateReview) reason = 'account-integrity-review';

    return Response.json({
      ok: true,
      emailVerified,
      emailRisk,
      duplicateRisk,
      eligibleForValueActions,
      reason,
      policy: {
        signupAllowed: true,
        publicToolsRemainAvailable: true,
        valueActionsRequireVerifiedNonDisposableEmail: true,
        duplicateRiskUsesShortLivedHashedSignals: true,
        sharedIpOrDeviceAloneNeverBlocks: true
      }
    }, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    if (error instanceof EligibilityError) {
      return Response.json({
        ok: false,
        code: error.code,
        error: error.publicMessage,
        eligibleForValueActions: false
      }, {
        status: error.status,
        headers: { 'Cache-Control': 'no-store' }
      });
    }
    console.error('Account eligibility error:', error instanceof Error ? error.message : 'Unknown error');
    return Response.json({
      ok: false,
      code: 'internal',
      error: 'Account eligibility is temporarily unavailable.',
      eligibleForValueActions: false
    }, {
      status: 502,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
}

async function verifiedFirebaseAccount(authorization) {
  const match = /^Bearer\s+([^\s]+)$/i.exec(String(authorization || ''));
  if (!match || match[1].length > MAX_BEARER_LENGTH) {
    throw new EligibilityError(401, 'unauthenticated', 'Sign in to NexusNova first.');
  }

  const idToken = match[1];
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken })
  });
  const result = await response.json().catch(() => ({}));
  const record = result.users?.[0];
  if (!response.ok || !record?.localId) {
    throw new EligibilityError(401, 'unauthenticated', 'Firebase session is invalid.');
  }

  const payload = decodeJwtPayload(idToken);
  const uid = String(record.localId || '');
  const now = Math.floor(Date.now() / 1000);
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid) ||
      payload.sub !== uid ||
      payload.aud !== FIREBASE_PROJECT_ID ||
      payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}` ||
      Number(payload.exp || 0) <= now) {
    throw new EligibilityError(401, 'unauthenticated', 'Firebase session is invalid.');
  }

  const createdAtMs = Number(record.createdAt || 0);
  return {
    uid,
    email: String(record.email || '').trim().toLowerCase(),
    emailVerified: record.emailVerified === true,
    createdAtMs: Number.isFinite(createdAtMs) && createdAtMs > 0 ? createdAtMs : 0
  };
}

function decodeJwtPayload(token) {
  try {
    const encoded = token.split('.')[1];
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encoded.length / 4) * 4, '=');
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(padded), char => char.charCodeAt(0))));
  } catch (_) {
    throw new EligibilityError(401, 'unauthenticated', 'Firebase session is invalid.');
  }
}

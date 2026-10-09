# NexusNova Support Payments: Production Activation Gate

This implementation is isolated from the existing HumanProof payment flow. It uses the documented Safepay v3 tracker + passport + hosted-checkout flow, matching the integration sequence already used by the protected HumanProof Worker without changing that Worker.

## Files added or changed in this feature

- `assets/js/nexusnova-support.js`: approved sitewide support control, server-side request, direct checkout redirect, and clear failure handling.
- `functions/api/support/create-checkout.js`: support-only checkout session creation with a server-side amount allowlist.
- `functions/api/support/payment-status.js`: signed-reference validation, Safepay Reporter lookup, merchant check, and exact expected amount/state check.
- `support-payment-success.html`: noindex return screen; it only says confirmed after the server verifies the signed support reference and Safepay status.
- `support-payment-cancelled.html`: noindex cancellation screen.
- `docs/support-payments-production-setup.md`: configuration and release gate.
- `tests/support-payments.test.mjs` and `.github/workflows/support-payment-validation.yml`: mocked contract tests and syntax checks.

The existing `cloudflare/safepay-webhook-worker.js`, all HumanProof checkout/return files, FBR systems, sitemap, robots.txt, canonical metadata, and article/tool body content are protected and must not be modified by this feature.

## Required Cloudflare Pages environment variables

Configure these in the Cloudflare Pages project that serves `nexusnovatools.com`, under **Settings → Variables and Secrets**. Pages Functions do not automatically inherit secrets from a separate Worker.

- `SAFEPAY_PUBLIC_KEY`: the merchant public/API key.
- `SAFEPAY_SECRET_KEY`: set as a secret; never place it in HTML, JavaScript, or Git.
- `SAFEPAY_ENV`: set to `production` only after the live merchant account and payment method are confirmed. Use `sandbox` in the Preview environment for sandbox tests.

Set variables independently for Preview and Production. Do not send secret values in chat or commit them to the repository.

The create-checkout function deliberately returns HTTP 503 on the `main` branch unless `SAFEPAY_ENV=production` and both keys exist. This prevents live visitors from being sent to sandbox checkout or a visual demo.

## Amount and payment safeguards

Only USD $3, $5, $10 and $25 are accepted by the server; amounts are converted to Safepay's minor unit server-side. Arbitrary amounts are rejected. The browser never supplies or receives the merchant secret. Checkout redirects are generated server-side using the established Safepay hosted checkout URL structure.

A short-lived HMAC-signed support reference binds the tracker, order ID, amount, currency, environment and purpose together. On return, the server verifies the signature, checks the tracker matches, queries Safepay Reporter, checks the merchant identity and exact quoted amount, and only then reports a paid state. The success page never trusts a browser redirect alone.

## Required release checks

Before merging the production UI:
1. Confirm this repository's Cloudflare Pages deployment actually builds the root `functions/` directory as Pages Functions.
2. Configure Preview and Production variables without exposing secret values.
3. Run mocked contract tests, invalid amount rejection, missing-secret 503, bad signed-reference rejection, merchant mismatch, exact amount mismatch, and successful status verification.
4. Run real Safepay sandbox test payments for all four supported amounts in a deployed Pages Preview environment.
5. Confirm success/cancel pages return `noindex,nofollow,noarchive` and test their desktop/mobile appearance.
6. Verify HumanProof checkout, success/cancel, and existing Worker health/payment-status behavior remain unchanged.
7. Only then consider merging the feature branch into `main`.

This document records required configuration and validation. It does not claim that credentials are already configured or that a real Safepay payment has been tested.

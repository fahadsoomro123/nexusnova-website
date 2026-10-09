# NexusNova Support Payments: Production Activation Gate

This implementation is intentionally isolated from the existing HumanProof payment flow.

## Files added

- `functions/api/support/create-checkout.js`: server-side, allowlisted one-time support checkout creation.
- `functions/api/support/payment-status.js`: server-side Safepay status lookup and support-order matching.
- `assets/js/nexusnova-support.js`: approved sitewide support control and direct redirect behavior.
- `support-payment-success.html`: noindex return page; it shows success only after the endpoint confirms the matching support order.
- `support-payment-cancelled.html`: noindex cancellation return page.

The existing `cloudflare/safepay-webhook-worker.js`, HumanProof checkout/return files, FBR systems, sitemap, robots.txt, canonical tags and existing editorial content are not modified by this feature.

## Required Cloudflare Pages environment variables

Configure these in the **Cloudflare Pages project that serves nexusnovatools.com**, under Settings → Variables and Secrets. This Pages Function does not inherit secrets from the separate `nexusnova-safepay` Worker.

- `SAFEPAY_PUBLIC_KEY`: the merchant public/API key.
- `SAFEPAY_SECRET_KEY`: store as a secret; never place it in HTML, JavaScript, or Git.
- `SAFEPAY_ENV`: set to `production` only after the live merchant configuration is confirmed. Use `sandbox` in Preview if a sandbox merchant is available.

Set variables for the Production environment. Do not send secret values in chat or commit them to the repository.

The function intentionally returns HTTP 503 on the `main` branch unless `SAFEPAY_ENV=production` and the required keys exist. This prevents a live visitor from being sent to a sandbox checkout or a fake preview checkout.

## Amount and payment safeguards

Only these amounts are accepted by the server: USD $3, $5, $10, and $25. Amounts are converted server-side to Safepay's minor currency unit. Any other amount is rejected. The browser never supplies the merchant secret. Only HTTPS checkout URLs on the Safepay domain are accepted for redirect.

The success page does not trust a browser redirect alone. It asks the server to query Safepay and only shows confirmed success when the state and support-order metadata match. If Safepay's live Reporter response omits the order metadata needed for that match, the page fails closed rather than falsely claiming a successful donation.

## Required release checks

Before merging the production UI:
1. Confirm the Cloudflare Pages production variables are configured without exposing them.
2. Test a sandbox contribution for each allowed amount in the Pages Preview environment.
3. Confirm valid checkout creation, invalid amount rejection, missing-secret 503, unsupported-origin rejection, and payment-status verification.
4. Confirm success/cancel pages return `noindex,nofollow,noarchive`.
5. Confirm HumanProof checkout, success/cancel, and existing Worker health/payment-status flows remain unchanged.
6. Verify desktop and mobile screenshots on the deployed Preview build.
7. Only then merge the feature branch to `main`.

This document describes the required configuration; it does not indicate that Safepay credentials have already been configured or that any real payment was tested.

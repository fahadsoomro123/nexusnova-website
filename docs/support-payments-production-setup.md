# NexusNova Support Payments: Production Activation Gate

## Hosting architecture

NexusNova's current static website is deployed through GitHub Pages. GitHub Pages does **not** execute Cloudflare Pages Functions from a root `functions/` directory. The support API therefore lives in its own Cloudflare Worker and uses the route `nexusnovatools.com/api/support/*`; the existing static site continues to render from GitHub Pages.

New isolated Worker files:
- `cloudflare/support-payments/worker.js`: support-only checkout creation and status verification.
- `cloudflare/support-payments/wrangler.jsonc`: the production Worker name, the support-only route, and fail-closed defaults.
- `cloudflare/support-payments/wrangler.preview.jsonc`: a separate sandbox-only Worker on `workers.dev`, with no custom-domain route.
- `assets/js/nexusnova-support.js`: approved support control with direct redirect to the returned Safepay checkout URL.
- `support-payment-success.html`: noindex return page; it only shows confirmed success after server-side checks.
- `support-payment-cancelled.html`: noindex cancellation page.
- `tests/support-payments.test.mjs` and `.github/workflows/support-payment-validation.yml`: mocked contract tests and syntax validation.

The old `functions/api/support/*.js` drafts were removed from this feature branch because they would never execute on the current GitHub Pages host.

## Protected production scope

The feature does not modify `cloudflare/safepay-webhook-worker.js`, existing HumanProof checkout/return files, FBR systems, mining/wallet systems, sitemap, robots.txt, canonical/indexing metadata, or article/tool content. Do not add support plans to the HumanProof Worker. The support Worker is a separate service.

## Required Worker variables and secrets

Set these on the **new `nexusnova-support-payments` Worker**, not on the existing HumanProof Worker.

- `SUPPORT_CHECKOUT_ENABLED`: must be exactly `true` to enable checkout.
- `SAFEPAY_ENV`: `sandbox` for preview testing; `production` only after successful sandbox tests and merchant confirmation.
- `SAFEPAY_PUBLIC_KEY`: Safepay merchant public/API key.
- `SAFEPAY_SECRET_KEY`: set as a Cloudflare Worker secret. Never put it in HTML, JavaScript, or Git.

The checked-in defaults are `SUPPORT_CHECKOUT_ENABLED=false` and `SAFEPAY_ENV=sandbox`. This deliberately leaves the public site API disabled until an administrator explicitly configures the dedicated Worker. Even if accidentally routed to the live domain, the Worker fails closed unless the flag is true, both keys exist, and `SAFEPAY_ENV=production`.

## Deployment plan

1. Create/deploy this Worker separately using `npx wrangler deploy --config cloudflare/support-payments/wrangler.jsonc`, or configure a **separate** Cloudflare Git integration for this subdirectory. Do not change the existing Telegram Worker configuration or HumanProof Worker.
2. Before attaching the production route, deploy with a sandbox merchant and test using its `workers.dev` URL. Use Worker Preview variables/secrets: `SUPPORT_CHECKOUT_ENABLED=true`, `SAFEPAY_ENV=sandbox`, sandbox `SAFEPAY_PUBLIC_KEY`, and sandbox secret `SAFEPAY_SECRET_KEY`.
3. Verify the new route doesn't conflict with any existing Cloudflare route rules. The existing HumanProof API routes must remain unchanged.
4. Run real Safepay **sandbox** flows for all four amounts: USD $3, $5, $10, and $25; check cancellation; and confirm server-side reporter verification.
5. Configure production Safepay keys and `SAFEPAY_ENV=production` on the new Worker, set `SUPPORT_CHECKOUT_ENABLED=true`, and deploy/attach only `nexusnovatools.com/api/support/*` (plus www route if required).
6. Open the deployed site on desktop and mobile, test amount taps, then check checkout and return flows. Only after those steps and explicit user approval may PR #205 be merged.

The repository does not give this workflow access to Cloudflare Worker secrets, nor has this isolated Worker been deployed or tested against a real Safepay sandbox from this change. Mocked tests are not a substitute for deployed sandbox payment tests.

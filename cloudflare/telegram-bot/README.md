# NexusNova Telegram Worker

This Worker powers `@NexusNovaToolsBot`, Telegram Mini App buttons, webhook handling, the Telegram-to-Firebase account bridge, the secure Telegram avatar proxy, and the website account-gateway Turnstile verification endpoints.

## Required encrypted secrets

- `TELEGRAM_BOT_TOKEN`
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `GEMINI_API_KEY` for Nova Intelligence

`FIREBASE_SERVICE_ACCOUNT_JSON` must be the complete JSON key generated for Firebase project `nexusnova-6ade2`. Store it only as a Cloudflare Worker **Secret**. Never paste it into source code, GitHub, chat, `.env`, or a plaintext Worker variable.

`GEMINI_API_KEY` is also a Cloudflare Worker **Secret**. Never paste it into source code, GitHub files, logs, or chat. `GEMINI_MODEL` is an optional non-secret Worker variable; when omitted, Nova uses the documented `gemini-3.8-flash` default.

## Production deployment

The repository source of truth is `cloudflare/telegram-bot/wrangler.jsonc`, whose configured Worker entrypoint is `worker-instagram-entry.js`. Wrangler must be run from `cloudflare/telegram-bot`; do not deploy `worker.js` by itself, because that would bypass the secure avatar proxy and auth-security endpoints.

Production deployment is now explicitly gated through `.github/workflows/nova-intelligence-quality.yml` so the Nova production verification runs only after the Worker source has been deployed from the exact GitHub commit under test.

The GitHub Actions deployment requires these **GitHub repository secrets**:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The Cloudflare API token should be scoped to the account/Worker deployment only. Do not store any application secret such as `GEMINI_API_KEY` in GitHub unless there is a separate deliberate secret-synchronization design; the existing Worker secret remains managed in Cloudflare.

The deploy workflow uses the official Wrangler GitHub Action and runs `wrangler deploy` against the repository's `wrangler.jsonc`. This makes the GitHub commit, deployed Worker source, and production QA path deterministic rather than relying on an undocumented manual/dashboard deployment.

## Dashboard activation

1. Open Firebase Console → Project settings → Service accounts → Generate new private key.
2. Open Cloudflare → Workers & Pages → `nexusnova-telegram-bot` → Settings → Variables and Secrets.
3. Add `FIREBASE_SERVICE_ACCOUNT_JSON` as **Secret**, using the complete downloaded JSON as its value.
4. Add `GEMINI_API_KEY` as **Secret**. Never put it in website JavaScript or repository source.
5. Ensure the Worker is deployed from `cloudflare/telegram-bot/wrangler.jsonc`; its configured entrypoint is `worker-instagram-entry.js`.
6. Open `https://nexusnova-telegram-bot.fahadsoomro123.workers.dev/setup` once.
7. Confirm `https://nexusnova-telegram-bot.fahadsoomro123.workers.dev/status` returns `"ok": true`.
8. Delete the downloaded Firebase service-account JSON from the device after the encrypted Worker secret is saved.

`worker-entry.js` delegates the existing bot/auth routes to `worker.js` and adds the signed `/api/telegram/avatar` proxy plus the website auth-security endpoints. The `/setup` route configures the webhook secret, bot commands, and Telegram menu Web App button. The `/api/telegram/session` and `/api/telegram/link` routes accept requests only from `https://nexusnovatools.com` and never return either server secret.

## Cloudflare Turnstile activation

The account gateway contains a real Turnstile integration, but it deliberately remains inactive until a production Turnstile widget and its Worker variables exist. No testing key or decorative CAPTCHA is used on the live account form.

1. In Cloudflare Turnstile, create a **Managed** widget for hostname `nexusnovatools.com`.
2. In Worker → Settings → Variables and Secrets, add `TURNSTILE_SITE_KEY`. The site key is public, but keeping deployment configuration in the Worker avoids hard-coding environment values into the website source.
3. Add `TURNSTILE_SECRET_KEY` as an encrypted **Secret**. Never put this secret in website JavaScript, GitHub, logs, or chat.
4. Deploy the Worker. `GET /api/auth/security-config` will report Turnstile enabled only when both values are present.
5. The website renders the widget explicitly and sends each token to `POST /api/auth/turnstile/verify` before the existing Firebase email/password auth handler can run.
6. The Worker validates the token with Cloudflare Siteverify and also checks the expected `auth` action and exact `nexusnovatools.com` hostname. Tokens are treated as single-use and the browser resets the widget for retries.

The account form stays usable before Turnstile production keys are installed, but the widget stays hidden so the site never pretends that bot protection is active when it is not.

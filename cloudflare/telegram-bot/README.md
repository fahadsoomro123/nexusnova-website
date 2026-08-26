# NexusNova Telegram Worker

This Worker powers `@NexusNovaToolsBot`, Telegram Mini App buttons, webhook handling, the Telegram-to-Firebase account bridge, and the secure Telegram avatar proxy.

## Required encrypted secrets

- `TELEGRAM_BOT_TOKEN`
- `FIREBASE_SERVICE_ACCOUNT_JSON`

`FIREBASE_SERVICE_ACCOUNT_JSON` must be the complete JSON key generated for Firebase project `nexusnova-6ade2`. Store it only as a Cloudflare Worker **Secret**. Never paste it into source code, GitHub, chat, `.env`, or a plaintext Worker variable.

## Dashboard activation

1. Open Firebase Console → Project settings → Service accounts → Generate new private key.
2. Open Cloudflare → Workers & Pages → `nexusnova-telegram-bot` → Settings → Variables and Secrets.
3. Add `FIREBASE_SERVICE_ACCOUNT_JSON` as **Secret**, using the complete downloaded JSON as its value.
4. Deploy this `cloudflare/telegram-bot` Worker using `wrangler.jsonc`. Its configured entrypoint is `worker-entry.js`; do **not** deploy `worker.js` by itself, because that would bypass the secure avatar proxy.
5. Open `https://nexusnova-telegram-bot.fahadsoomro123.workers.dev/setup` once.
6. Confirm `https://nexusnova-telegram-bot.fahadsoomro123.workers.dev/status` returns `"ok": true`.
7. Delete the downloaded service-account JSON from the device after the encrypted Worker secret is saved.

`worker-entry.js` delegates the existing bot/auth routes to `worker.js` and adds the signed `/api/telegram/avatar` proxy. The `/setup` route configures the webhook secret, bot commands, and Telegram menu Web App button. The `/api/telegram/session` and `/api/telegram/link` routes accept requests only from `https://nexusnovatools.com` and never return either server secret.

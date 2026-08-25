# NexusNova Telegram Worker

This Worker powers `@NexusNovaToolsBot`, Telegram Mini App buttons, webhook handling, and the free-plan Telegram-to-Firebase account bridge.

## Required encrypted secrets

- `TELEGRAM_BOT_TOKEN`
- `FIREBASE_SERVICE_ACCOUNT_JSON`

`FIREBASE_SERVICE_ACCOUNT_JSON` must be the complete JSON key generated for Firebase project `nexusnova-6ade2`. Store it only as a Cloudflare Worker **Secret**. Never paste it into source code, GitHub, chat, `.env`, or a plaintext Worker variable.

## Dashboard activation

1. Open Firebase Console → Project settings → Service accounts → Generate new private key.
2. Open Cloudflare → Workers & Pages → `nexusnova-telegram-bot` → Settings → Variables and Secrets.
3. Add `FIREBASE_SERVICE_ACCOUNT_JSON` as **Secret**, using the complete downloaded JSON as its value.
4. Deploy `worker.js`.
5. Open `https://nexusnova-telegram-bot.fahadsoomro123.workers.dev/setup` once.
6. Confirm `https://nexusnova-telegram-bot.fahadsoomro123.workers.dev/status` returns `"ok": true`.
7. Delete the downloaded service-account JSON from the device after the encrypted Worker secret is saved.

The `/setup` route configures the webhook secret, bot commands, and Telegram menu Web App button. The `/api/telegram/session` and `/api/telegram/link` routes accept requests only from `https://nexusnovatools.com` and never return either server secret.


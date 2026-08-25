# NexusNova Project Knowledge — Local AI Context

Updated: 26 Aug 2026

## Main public assets
- Website: https://nexusnovatools.com/
- Website GitHub repo: `fahadsoomro123/nexusnova-website`
- Android repo: `fahadsoomro123/nexusnova-app`
- Official email: `nexusnovatools@gmail.com`
- Telegram bot: `@NexusNovaToolsBot`
- Telegram Mini App URL: https://nexusnovatools.com/
- Telegram Worker webhook URL is public, but bot token is SECRET and must never enter client code or public GitHub files.

## Website purpose
NexusNova Tools is a browser-first utility site with practical tools and articles. Existing areas include AI/token utilities, image/PDF tools, OCR/QR, calculators, gaming utilities, developer tools, productivity, articles, tech/security guides, account/Firebase integration, and NOVA assistant UI.

## Hosting / deployment facts
- Website uses GitHub Pages with custom domain `nexusnovatools.com`.
- `CNAME` is part of the website repo.
- Firebase is used for optional account/auth/profile functionality.
- Existing GitHub Actions already include article-feed rebuilding and Telegram Mini App checks.

## Development rules from the owner
- Branch → inspect exact diff → PR → merge.
- Do not call a GitHub merge a live deployment PASS until the domain itself is independently verified.
- Do not touch working JS/functionality without an actual bug.
- Do not fabricate reviews, users, downloads, credentials, authors, revenue or popularity numbers.
- The owner prefers Roman Urdu, short/direct steps, and is not a developer.
- For routine safe work, continue without repeatedly asking permission.

## Telegram state
Already completed: bot creation, branding, commands, inline mode, groups, Mini App, menu button, Cloudflare Worker, webhook, start/help/welcome flow. Do not redo Cloudflare bindings unless evidence shows a real binding problem.

Important auth design:
- Telegram Mini App `initData` must be verified server-side.
- Never trust `initDataUnsafe.user` alone for authentication.
- Bot token stays only on backend/Cloudflare secrets.
- Firebase custom-token/service credentials must never be published client-side.

## SEO principles
- Prefer useful original tools/guides over scaled near-duplicate keyword pages.
- Keep sitemap/lastmod/RSS/internal linking accurate.
- Measure traffic and indexing; do not promise rankings.
- Public site has GA4 configuration; actual analytics numbers must be read from real analytics data, never guessed.

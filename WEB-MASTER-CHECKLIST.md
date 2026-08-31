# NexusNova Website Master Checklist

This checklist is the source of truth for website readiness, production verification, provider integrations, deployment hygiene, growth operations, and launch gating.

## 1. Core website

- [x] Production domain live: `https://nexusnovatools.com`
- [x] HTTPS enabled
- [x] Main navigation works
- [x] Core tools and content pages are reachable
- [x] `robots.txt` present
- [x] XML sitemaps present
- [x] `ads.txt` present
- [x] `app-ads.txt` present
- [x] Privacy, Terms, Disclaimer, About and Contact pages present
- [x] No fake physical address is published
- [x] NexusNova contact email is configured

## 2. Authentication and account identity

### Email/password

- [x] Firebase email/password registration flow implemented
- [x] Email verification flow implemented
- [x] Existing account login flow implemented
- [x] Verified email mission reflects real server/account state

### Google

- [x] Firebase Google provider configured
- [x] Production popup flow works on `nexusnovatools.com`
- [x] Existing NexusNova account can link a real Google identity
- [x] Dashboard shows `CONNECTED` only after provider data confirms `google.com`
- [x] Production linking verified

### X / Twitter

- [x] Firebase Twitter/X provider configured
- [x] Production popup flow works on `nexusnovatools.com`
- [x] Existing NexusNova account can link a real X identity
- [x] Dashboard shows `CONNECTED` only after provider data confirms `twitter.com`
- [x] Production linking verified

### Facebook

- [x] Separate Meta authentication app created with Facebook Login use case
- [x] Firebase callback URL added in Meta configuration
- [x] Meta App ID and App Secret saved in Firebase Facebook provider
- [x] Explicit unapproved `email` scope request removed from NexusNova frontend
- [x] Production Facebook popup completes successfully
- [x] Existing NexusNova account links a real Facebook identity
- [x] Dashboard shows `CONNECTED` only after Firebase provider data confirms `facebook.com`
- [x] Production linking verified on 2026-08-31
- [x] Connected-state UI cleanup committed so stale `Connecting…` text is hidden after provider confirmation

### Apple

- [ ] Apple provider production setup intentionally deferred on 2026-08-31
- [ ] Apple Developer configuration / Services ID not started
- [ ] Firebase Apple provider configuration not started
- [ ] Production linking not verified
- [x] Dashboard must keep Apple non-connected while provider setup is deferred

### Instagram

- [ ] Keep Instagram mission non-fake until a supported Meta/Instagram identity mechanism is wired
- [ ] Do not award or display a connected state without server/provider verification

## 3. Telegram identity

- [x] Telegram bot exists: `@NexusNovaToolsBot`
- [x] Mini App opens inside Telegram
- [x] Telegram user identity can be server-linked to the NexusNova Firebase profile
- [x] Dashboard can display a real Telegram connected state
- [x] Telegram connection is not faked client-side

## 4. Referral and rewards safety

- [x] Referral code validation exists
- [x] Referral attachment is server-side
- [x] Self-referral protection exists
- [x] Duplicate/referral window handling exists
- [x] Reward/account states must come from trusted data
- [x] No fake connected/provider reward state should be shown

## 5. Mining/account dashboard constraints

- [x] Existing mining design preserved during auth work
- [x] Mining state remains server/account driven
- [x] Provider UI changes do not alter mining calculations
- [x] Connected missions do not fabricate rewards

## 6. Homepage / app promotion constraints

- [x] Homepage phone visuals preserved during account/auth provider work
- [x] Android app repository is not modified by website auth work
- [x] Website account changes remain isolated from Android application source

## 7. Deployment hygiene

- [x] Production branch: `main`
- [x] GitHub Pages/custom-domain deployment in use
- [x] Cache-busting is used when auth JS changes require a fresh browser load
- [x] Provider UI must be retested after deploy before status is marked complete

## 8. Social/community presence

- [x] X presence configured
- [x] Facebook page configured
- [x] Instagram account created
- [x] Telegram channel/bot presence configured
- [x] WhatsApp channel created
- [ ] TikTok presence/setup status to be confirmed before marking complete

## 9. SEO / discoverability

- [x] Sitemap infrastructure present
- [x] Search-focused tools/content architecture present
- [x] Metadata and structured content work exists across the site
- [x] Search growth automation/workflows exist
- [ ] Continue monitoring indexing, quality, spam-update impact and search performance

## 10. AdSense / monetization readiness

- [x] Required legal/policy pages exist
- [x] `ads.txt` is present
- [x] Website has original tools/content structure
- [ ] Final AdSense readiness review remains a separate production gate
- [ ] Apply only when content, UX, indexing and policy readiness are confirmed

## 11. Production auth verification status

| Provider | Firebase/config | Production test | Dashboard verified | Status |
|---|---|---|---|---|
| Email | Yes | Yes | Yes | VERIFIED |
| Google | Yes | Yes | Yes | VERIFIED |
| X | Yes | Yes | Yes | VERIFIED |
| Facebook | Yes | Yes | Yes | VERIFIED |
| Apple | Deferred | Not run | No | DEFERRED |
| Instagram | Supported mechanism pending | Pending | Pending | CONFIG REQUIRED |
| Telegram | Yes | Yes | Yes | CONNECTED |

## 12. Immediate next work

1. After the current Pages deploy, do one visual refresh of `account.html` to confirm Facebook no longer leaves stale `Connecting…` text under the verified card.
2. Keep Apple deferred and non-connected unless the owner later chooses to activate the required Apple developer setup.
3. Continue Instagram only through a supported Meta/Instagram identity mechanism; no fake provider linking.
4. Move on to the next website production/readiness task after the auth dashboard visual verification.

## 13. Non-negotiable rules

- Never expose secrets in chat, commits, logs, screenshots, or public documentation.
- Never fake connected provider states.
- Never fake reward states.
- Do not modify mining design while doing provider/auth work unless explicitly requested.
- Do not modify homepage phone visuals during provider/auth work unless explicitly requested.
- Do not modify the Android app repo from this website-auth workflow.
- Mark a provider complete only after real production verification.

# NexusNova Website — Master Completion Checklist

Last established direction: website work only. Do not modify `fahadsoomro123/nexusnova-app`; app development is handled separately.

This file is the source-of-truth checklist for the website/web-app work discussed with the owner. Nothing below should be treated as complete until it is genuinely implemented and verified.

## 1. Header / Account Entry
- [x] Remove old single `Account` nav item from global website navigation.
- [x] Add `Sign in` and premium `Sign up` actions in the global header.
- [x] Support direct sign-in/sign-up modes via account gateway URL state.
- [ ] Logged-in header state: avatar/profile/account menu instead of guest auth buttons.
- [x] Verify desktop + mobile navigation accessibility and responsive behavior. GitHub Site Quality Audit run `33313392595` passed on 2026-08-30 with desktop/mobile overflow, broken-image, menu touch-target, keyboard toggle and `aria-expanded` checks.

## 2. Account / Authentication
- [x] Preserve email + password registration/sign-in.
- [x] Keep website tools public; no login wall for normal browser tools.
- [x] Keep mining OFF after signup; account creation must never auto-start mining.
- [x] Email verification UX and eligibility enforcement fully verified end-to-end on 2026-08-30 using the live Firebase-verified account state shown in the production dashboard.
- [ ] Google official sign-in/account-linking.
- [ ] X official OAuth account-linking.
- [ ] Apple official sign-in/account-linking where configuration is available.
- [ ] Facebook official account-linking where Meta configuration/permissions allow it.
- [ ] Instagram official account-linking only through supported Meta/Instagram mechanisms; never fake a connected state from a link click.
- [ ] Proper account-linking rules so one external identity cannot earn/connect to multiple NexusNova accounts.
- [x] Preserve Telegram Mini App/account linking behavior where already supported.

## 3. Anti-Abuse / Account Protection
- [x] Real Cloudflare Turnstile bot protection on sensitive email/password auth flows. Production Managed Turnstile is active on `nexusnovatools.com` and the live auth flow was verified on 2026-08-30.
- [x] Server-side Turnstile verification code is implemented in the Cloudflare Worker; the secret is never present in browser JavaScript or repository source.
- [x] Client auth guard blocks the existing Firebase handler until a configured Turnstile token is verified server-side; no decorative/fake CAPTCHA state is shown while production keys are absent.
- [x] Add production `TURNSTILE_SITE_KEY` and encrypted `TURNSTILE_SECRET_KEY`, deploy, and verify end-to-end on `nexusnovatools.com` before marking CAPTCHA fully complete.
- [x] Disposable/temp-email risk checks for reward/mining eligibility. A Firebase-token-authenticated Worker route now derives verified-email + known temporary-domain risk server-side, fails value eligibility closed, and the live Worker route passed Beta Validation run `33313849832` on 2026-08-30; signup itself remains allowed and public tools remain unaffected.
- [x] Signup/sign-in abuse throttling is wired into the production Turnstile verification path using short and long hashed IP/User-Agent windows; Worker code verified on 2026-08-30.
- [ ] Risk-based duplicate-account protection using safe signals; do not hard-lock one account per shared IP/device.
- [ ] Firebase/App Check protection where production configuration is available.
- [ ] Re-authentication/step-up protection for future high-value account actions.
- [x] No phone OTP requirement for now.

## 4. Web App / Premium Dashboard
- [x] Build a proper website Web App/dashboard experience, separate from the Android app repository.
- [x] Use premium Hyper-Realistic 3D Glassmorphism + Skeuomorphic futuristic UI.
- [x] Responsive/mobile-safe, fast, accessible, and reduced-motion aware.
- [x] Real account state only; no fake balances, counters, countdowns, connected states, or reward completion.
- [x] Account overview / verification status / connected identities.
- [x] NVX/rewards area with clear state and truthful eligibility messaging.
- [x] Compact-density redesign verified visually on production on 2026-08-30: hero/cards/padding reduced and unnecessary scrolling materially reduced while preserving readable controls.
- [ ] Manual mining CTA/entry presentation only where the website architecture genuinely supports it; never auto-start mining.
- [ ] Halving/FOMO presentation must use real stage/rate data only; no fake urgency/countdown. Current web UI deliberately shows unavailable until a trusted source is connected.

## 5. Earn NVX / Missions
- [x] Create premium `Earn NVX / Missions` section.
- [x] Verify Email mission state from real Firebase Auth verification.
- [x] Complete Profile mission state from the real Firebase profile.
- [x] Connect Telegram mission/status where server-verifiable using the existing Telegram link flow.
- [ ] Connect X mission via official OAuth; reward account connection, not engagement.
- [ ] Connect Facebook mission where officially verifiable.
- [ ] Connect Instagram mission where officially verifiable.
- [ ] One-time reward per external identity globally.
- [ ] Rewards issued server-side and idempotently; browser must not directly set balance/reward state.
- [x] Real completion/locked/error-oriented states in the current mission UI; unconfigured social providers stay visibly locked.
- [ ] Optional first verified/manual mining milestone reward only if backend supports it safely.
- [ ] Optional mobile-app activation milestone later, only after a real public build/Play path exists and policy checks pass.

## 6. Social / Community Growth
- [x] Show official NexusNova X, Facebook, Instagram and Telegram destinations in the Web App/community area.
- [x] Recognizable branded visual icons for X, Facebook, Instagram and Telegram verified visually in the production mission/community UI on 2026-08-30.
- [x] Keep Follow / Like / Comment / Repost as organic community actions with no direct NVX claim condition.
- [x] Do not compensate X Likes, Replies, Reposts, Views or Follows.
- [x] Do not create fake verification for social engagement.
- [ ] Community/weekly missions should use first-party or officially verifiable actions.

## 7. Referral System
- [ ] Keep unique NexusNova referral codes / attribution.
- [x] Prevent self-referral and obvious duplicate/fake activation abuse. The authenticated Worker transaction rejects self-referral, blocks switching an existing attribution, enforces a new-account referral window and returns idempotently for the same already-attached code; regression test coverage passed in beta on 2026-08-30.
- [ ] Reward only after a genuine verified activation milestone.
- [ ] Referral rewards server-side and idempotent.
- [x] Clear pending / verified / direct UI states are preserved in the account dashboard.

## 8. NexusNova App Promotion on Website
- [x] Position NexusNova as `57+ Smart Tools in One App`, not primarily as a mining app.
- [x] Promote broad utility categories first; mining/NVX stays secondary.
- [x] Official preview/Coming Soon style without fake download links or install counters.
- [x] Realistic FOMO/early-access messaging without fake deadlines.
- [ ] Keep exact feature/category copy synchronized with the real app as the release approaches, without editing the app repo.
- [x] Approved real NexusNova Nova Hub artwork from `ota/files/assets/icons/nova-hub/` is used in the production app preview and was visually verified on 2026-08-30.
- [ ] Add real screenshots/previews only from approved real app assets when available.

## 9. APK Release Website Flow — Future Trigger
- [x] Do not publish a fake APK button before a verified build exists.
- [ ] When owner provides/approves real APK: add official APK download page/route.
- [ ] Show real version, file size, release date and changelog.
- [ ] Publish SHA-256 checksum for the released APK.
- [ ] Add safe Android sideload/install instructions and authenticity warning.
- [ ] Promote same NexusNova account concept without changing app code.
- [x] Keep Play Store status as Coming Soon until verified listing is live.

## 10. Google Play Website Flow — Future Trigger
- [ ] Replace Coming Soon with official verified Google Play destination only when live.
- [ ] Make Play Store the primary trusted install route after launch.
- [x] No NVX reward for rating/review in current website UX.
- [x] Avoid manipulative install/review incentives in current website UX.
- [ ] If a first-party mobile activation bonus is introduced, reward actual verified in-app/account activation rather than store ratings/reviews.

## 11. SEO / Trust / AdSense Readiness
- [x] Maintain crawlability/indexability of public tool/content pages. Full static site-map/SEO/internal-link scan passed with zero severe findings in Site Quality Audit run `33313392595` on 2026-08-30.
- [x] Keep account gateway/dashboard noindex where appropriate.
- [x] Ensure structured data, canonical tags, titles/descriptions and social metadata remain valid after redesigns. Full static SEO metadata gate passed in Site Quality Audit run `33313392595` on 2026-08-30.
- [ ] Check Core Web Vitals/performance after 3D/glass UI additions.
- [x] Add responsive and reduced-motion handling to the new Web App UI; representative desktop/mobile browser quality is CI-verified, while a broader accessibility audit can still be expanded later.
- [x] Keep Privacy / Terms / FAQ aligned with actual authentication, analytics, referral and reward behavior. Trust pages were synchronized to the current beta behavior and the beta regression gate passed on 2026-08-30.
- [x] No fake company address/location, phone or unsupported claims in the new Web App work.
- [x] Preserve public website tools without a login wall during AdSense review.

## 12. Social Launch Automation via GitHub
- [x] Existing website repo has GitHub-based social distribution infrastructure for Telegram, X, Facebook and Instagram when credentials/configuration are valid.
- [x] Dedicated one-time `NexusNova Major Web Launch` workflow exists and was code-verified on 2026-08-30 with explicit owner confirmation and master release-gate checks.
- [x] Major launch workflow generates platform-appropriate factual X/Facebook/Instagram/Telegram launch copy from real website state and verifies the 57+ claim before publication.
- [x] Duplicate-post protection is implemented using persistent successful-publication history and blocks a second successful major launch.
- [ ] Verify each destination result from workflow output/report before claiming success.
- [ ] Automatic launch should run only after this master website checklist's release-blocking items are genuinely complete.

## 13. Non-Negotiable Rules
- [x] Website repo only for this work.
- [x] Do not modify `fahadsoomro123/nexusnova-app` unless the owner explicitly reverses this instruction later.
- [x] Do not generate website-design images unless explicitly requested later.
- [ ] Do not break existing working website tools/auth/referral/Telegram behavior unnecessarily.
- [x] Do not add fake functionality, fake connected states, fake timers, fake counters or fake progress in the new Web App phase.
- [x] Do not expose secrets/tokens in client code, commits, logs or chat in the new Web App phase.
- [ ] Every item marked complete must be verified against current repository/deployed behavior before final launch.

## Release Gate
The website is not considered fully complete until all currently applicable release-blocking items above are either:
1. implemented and verified, or
2. explicitly deferred by the owner because they depend on a future external event such as APK/Play Store availability.

Future APK/Play Store-triggered items remain tracked here so they are not forgotten.

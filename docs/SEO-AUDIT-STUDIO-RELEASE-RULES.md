# NexusNova SEO Audit Studio: release and fix rules

These are release-blocking product and engineering requirements. They apply to the website UI and the separate Cloudflare Worker/D1 backend. Do not treat this file as proof that a requirement is already implemented.

## Product UI
- Keep the public SEO Audit Studio page minimal. Show only the product name, URL field, run-audit action, necessary progress/error/source/coverage states, real findings, essential limitations, and accurate payment/voucher instructions. Remove redundant marketing copy, decorative fake dashboards, filler paragraphs and duplicate FAQs.
- Never prefill the target with `https://example.com`; a sample must never be presented as a live audit.
- Preserve the existing voucher section/box in place, but replace the old **Claim voucher** controls with a share-post URL field and a **Verify & unlock voucher** action. Do not add a second separate voucher section.
- State the condition plainly: a free full-report voucher is issued only after the user shares NexusNova on a supported social platform and submits the share/post URL for verification.
- Do not claim social verification is complete just because a link was pasted, redirects, returns HTTP 200, or has matching metadata. Verify the platform post and that it genuinely references the canonical NexusNova website using a trustworthy provider API/OAuth verification or similarly reliable public evidence.
- If a social platform blocks verification, requires login, removes access, or returns ambiguous evidence, fail closed: show **Could not verify this share** / **Verification unavailable** and issue no voucher. Never manually assume success and never generate a placeholder voucher.
- Only report remaining voucher counts, offer terms and expiry supplied by an active backend campaign. A claimed share is not a redeemed voucher; tie redemption to the authenticated session/audit and enforce single-use rules server-side.

## Audit truthfulness and evidence
- Never invent scores, grades, metrics, findings, source names, URLs, dates, counts, payment status, vouchers or provider responses.
- A live overall grade requires valid raw-HTML evidence and actual mobile and desktop PageSpeed/Lighthouse data. If required evidence is missing, withheld, quota-limited, malformed or stale beyond the defined contract, return a partial/unscored result with explicit source status. Do not replace missing data with zero, 100, A+, canned findings or a fake pass.
- Keep sample/test/demo results isolated from production APIs and clearly labelled as sample. Production routes must not expose review mocks or simulation unlocks.
- Each recommendation must be grounded in an observed check or provider-returned opportunity. Include source/evidence and estimated savings only when the provider actually returns them. Do not describe lab readings as field/Core Web Vitals measurements.
- Validate status codes, JSON content type/shape, numerical bounds and source freshness before accepting provider data. Sanitize resource URLs and remove query strings/secrets from evidence.

## API reliability and security
- Use bounded request timeouts, bounded retries only for safe/idempotent calls, cancellation on timeout, clear actionable errors, and a guaranteed reset of loading/disabled UI. Never retry payment creation or voucher issuance blindly in a way that could duplicate a transaction.
- Validate all input on the server. Block localhost, private/link-local IPs, IP literals and internal hostnames; defend against DNS rebinding and redirects to unapproved/private destinations for every user-controlled outbound fetch, including social links.
- Enforce HTTPS/origin allowlists, session expiry and bearer authentication, rate limits, database uniqueness/atomic counters and least-privilege access. Secrets must stay in platform secret storage, never in browser bundles, HTML, client logs or error responses.
- Parse external responses defensively. Redact tokens, authorization headers, API keys, personal data and query-string secrets. Expose a stable, sanitized error code/message rather than a raw upstream stack trace.
- Provider outage, quota errors, malformed payloads and missing credentials must fail closed and be visible as unavailable/partial, not be silently transformed into a success. Add tests for timeout, malformed JSON, 4xx/5xx, rate-limit, missing secret, duplicate submit, expired session and upstream denial.

## Vouchers, promotions and payment integrity
- Voucher issuance must only follow verified social-share evidence and an active, non-exhausted backend campaign. Enforce allowed platforms/hosts, canonical target URL checks, anti-abuse/rate limits, unique claim records and single-use, session-bound redemption. Store only the minimum evidence needed; avoid unnecessary personal data.
- Never trust browser-reported `verified`, client-side storage, an uploaded screenshot alone, an arbitrary URL, a payment redirect or a client-side button.
- A full report unlock requires a valid server-side entitlement, verified voucher redemption, or the payment provider's authenticated/signed confirmation matching the exact order, audit/session, amount, currency, environment and successful terminal state.
- SafePay live card configuration must be verified before enabling checkout. Keep NOWPayments/crypto closed until real live API/IPN credentials and required legal/compliance/provider approvals are independently verified. Never bypass the existing crypto compliance gate to make the UI appear complete.
- Do not run a real charge/transfer as an unapproved smoke test. Use provider sandbox or a documented owner-approved low-value test where permitted.

## Database and migration safety
- Review D1 schema changes before deployment. Migrations must be additive, repeatable/safe for the release process, tested against a clean DB and a representative existing DB snapshot, and must preserve existing campaign/claim/entitlement records.
- Add an explicit migration for social-share verification/claim evidence and idempotency if existing schema cannot securely support it. Never mark an existing claim verified merely because old code issued a voucher.
- Do not run production migrations or rotate production secrets until source, configuration and rollback paths pass review.

## Release, verification and rollback
- Keep website and backend changes in their respective repositories. Website UI goes through a reviewed PR into `nexusnova-website/main`; Worker/D1 changes go through a separate reviewed PR into `nexusnova-seo-audit-studio-backend/main`.
- Never merge with unexplained failed checks, unresolved critical/high findings, broken responsive/accessibility states, or untested payment/voucher paths. Do not weaken general site-quality thresholds to conceal a failure. For the intentionally minimal Audit Studio page, make only a narrow, tested audit-rule exception tied to that route if needed; keep all functional/security/value checks active.
- Required checks: full automated suite, syntax/static checks, dependency audit, Wrangler dry run, API integration tests, negative/fail-closed cases, mobile/desktop responsive tests, production health/config/offer checks, genuine audit on a controlled URL, social verification positive and negative cases, voucher expiry/limits/redeem, Owner Console auth, and payment lock/unlock contracts.
- Deploy the website and Worker independently, in the documented order. Confirm the exact deployed commit/assets using content hashes, not only HTTP 200 or a green workflow. Smoke test live audit/source attribution, share verification, voucher claim/redeem, full-report entitlement, SafePay readiness and disabled crypto gate.
- If post-deployment smoke checks fail, stop rollout and use the documented rollback. Report what is live versus unverified honestly.
- No “error-free”, “perfect” or “fully live” claims without corresponding evidence. External providers can fail; the product must handle failures truthfully and safely.

## Current known release notes (2026-10-22)
- Website base main commit at start of release: `29b5834abeb1a44bf0320f7bdd84a570b909133c` on the current remote branch snapshot. The earlier performance change is already in main.
- Website PR #365 (`release/seo-audit-real-no-filler-20261022`) contains the minimal homepage/tool copy changes. It is not yet merged; its manual value audit currently flags two warnings because the concise tool page intentionally omits FAQ/filler. Resolve with the narrow tested Audit Studio-specific audit exception, not by restoring unwanted filler and not by disabling the gate.
- Backend main: `4bb7176c0c5660ad824e34b88f058784a056e64e`. Local release branch `release/audit-studio-production-20261022` passed 103 tests, `npm audit --omit=dev` (0 vulnerabilities), and Wrangler production dry run. This is not proof of deployment.
- Live API health/config/active-promotion endpoints returned HTTP 200. Live PageSpeed audit returned valid measured mobile/desktop sources but also showed a desktop CLS finding (0.13); report that truthfully.
- Public config currently reports SafePay production/onboarding configured, but NOWPayments is not configured and crypto compliance is false. Keep crypto closed.
- Social-share verification is a new requested feature and is NOT implemented yet. Do not issue vouchers before the verification route, security tests and D1 support are in place.

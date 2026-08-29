# NexusNova Owner Control Center

This file is the simple owner runbook for keeping NexusNova running even when ChatGPT Plus is not active.

## What keeps running without ChatGPT Plus

The website, GitHub Pages deployment, scheduled GitHub Actions, traffic diagnostics, site-health checks, social automation and repository housekeeping are separate from a ChatGPT Plus subscription. They continue as long as the domain/hosting, GitHub account and any required third-party credentials or quotas remain active.

ChatGPT Plus is not a hosting service and is not required for the public website to stay online.

## Android GitHub app: where to check the site

Open the GitHub Android app, open `fahadsoomro123/nexusnova-website`, then open **Actions**.

Useful workflows:

- **NexusNova Today Traffic Pulse** — same-day GA4 users, sessions and page views.
- **NexusNova Daily Traffic Autopilot** — traffic diagnosis, search growth, social distribution and site checks.
- **Daily Website Caretaker** — important public endpoints and website-health checks.
- **Social Audience Watch** — social connection/audience monitoring.
- **Repository Housekeeping** — repository cleanup/maintenance.
- **NexusNova Safe Tool Factory** — creates a tested draft tool PR from a plain-language idea.

For any workflow: tap it, tap the newest run, then open the job/step or Summary. Green means that run passed. Red means inspect the failed step before changing anything.

## Make a new tool without writing code

1. Open **Actions**.
2. Open **NexusNova Safe Tool Factory**.
3. Tap **RUN WORKFLOW**.
4. In `tool_idea`, write the tool in normal language, for example: `Calculate percentage increase or decrease between two values`.
5. Run the workflow.
6. The factory asks the configured Gemini provider first and uses the configured OpenAI provider only as fallback.
7. It rejects high-risk tool ideas, restricts generated JavaScript, runs deterministic calculation tests and runs the full site-quality audit.
8. If successful, it creates an isolated branch and tries to open a Pull Request.
9. **It never auto-merges.** Review the PR and merge only when checks are green and the examples/results look correct.

Important: this Tool Factory does not depend on a ChatGPT Plus subscription, but AI generation does depend on the API credentials/quota configured in GitHub. If both AI providers are unavailable, the existing website keeps running; only new AI-generated drafts stop until a provider is available again.

## Safe owner rules

- Never paste API keys, service-account JSON, access tokens, tax IDs or passwords into GitHub issues, PR comments or public files.
- Never merge a Tool Factory PR with red checks.
- Do not delete or replace `ads.txt` while AdSense is using the current publisher record unless Google specifically requires a change.
- Do not use bought traffic, fake clicks or fake followers.
- Do not make large redesigns just because one traffic day is low; use complete GA4/GSC comparison windows first.

## If something breaks

First open **Daily Website Caretaker** and **NexusNova Today Traffic Pulse**. If the caretaker is green but traffic is low, the website is normally online and the problem is growth rather than availability. If the caretaker is red, open the failed step and use the exact error as the repair starting point.

If a new Tool Factory draft is bad, simply do not merge its PR. Main remains unchanged.

## Monthly owner checklist

Check that the domain is not close to expiry, GitHub Actions are still running, AdSense/AdMob account notices have no unresolved action, social credentials have not expired, and AI/API quotas are not exhausted. No coding is required for these checks.

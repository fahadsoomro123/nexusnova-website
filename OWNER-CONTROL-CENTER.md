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
- **NexusNova New Tool Social Launch** — announces a newly published dedicated tool on configured social channels.

For any workflow: tap it, tap the newest run, then open the job/step or Summary. Green means that run passed. Red means inspect the failed step before changing anything.

## Make a new tool without writing code

1. Open **Actions**.
2. Open **NexusNova Safe Tool Factory**.
3. Tap **RUN WORKFLOW**.
4. In `tool_idea`, describe the tool in normal language.
5. Run the workflow.
6. The factory asks Gemini first, automatically tries stable Gemini fallback models when the primary model is overloaded/unavailable, and uses the configured OpenAI provider as the final fallback.
7. It rejects high-risk tool ideas, restricts generated JavaScript, runs deterministic calculation tests and runs the full site-quality audit.
8. If successful, it creates an isolated branch and tries to open a Pull Request.
9. **It never auto-merges.** Main stays unchanged until you approve the PR.

Important: this Tool Factory does not depend on a ChatGPT Plus subscription, but AI generation depends on API credentials/quota configured in GitHub. If all AI providers are unavailable, the existing website keeps running; only new AI-generated drafts stop until a provider becomes available again.

## Android: review a draft tool before publishing

1. In the GitHub app open the repository and tap **Pull requests**.
2. Open the newest PR whose title starts with **Tool Factory:**.
3. On the PR, first check **Checks** / status. Do not publish while any required check is red or still running.
4. Open **Files changed**. A normal Tool Factory PR should mainly contain the new dedicated `.html` tool page. Unexpected unrelated edits are a reason not to merge.
5. Go back to the Tool Factory Actions run that created the PR. In its artifacts, download `nexusnova-tool-preview-<run id>`. If the GitHub Android app does not expose artifact download, open the same run in Chrome.
6. Extract the downloaded ZIP with Android Files/File Manager, open its `index.html` in Chrome, and test the draft locally. This copy is offline and is not the public website.
7. Try normal values, zero/empty values and at least one example you can calculate independently. Confirm the title, explanation, mobile layout and result wording make sense.
8. If anything looks wrong, **do not merge**. Leave the PR open or close it and create a corrected Tool Factory run.

## Publish an approved draft

1. Return to the Tool Factory PR in **Pull requests**.
2. Confirm all required checks are green and you are happy with the offline preview.
3. Tap **Merge pull request**.
4. Confirm the merge. This is the actual publish action: the new file enters `main` and the site deployment starts.
5. Open **Actions** and confirm the site/deployment checks complete successfully.
6. The **NexusNova New Tool Social Launch** workflow should detect the newly added dedicated tool after it reaches `main`, generate a launch card, wait for the public tool/image to become reachable, then announce it on configured social channels. It records announcement history to avoid duplicate posts.
7. After deployment, open the real NexusNova tool URL once and confirm it works. If a deployment check is red, investigate before promoting the URL manually.

Note: X posting depends on X API credits being available. Other configured channels can still succeed independently when X is unavailable.

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

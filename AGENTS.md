# Locked Component / Change-Control Rule

This is a locked project rule for NexusNova.

1. Once a component or behaviour passes its relevant tests and is verified in the preview, treat it as **LOCKED / FROZEN**.
2. Do not refactor, restyle, rename, reorder, or otherwise touch locked areas while fixing another issue.
3. A locked area may be edited only when the current bug is proven to originate there. Keep the patch minimal and document why that locked area had to change.
4. Before editing, identify the specific failing behaviour and the smallest set of files involved. After editing, run targeted checks and the full regression suite.
5. If an existing test fails, fix the regression before deploying. Do not weaken or delete a test just to make the run pass.
6. Never describe a change as fixed until the relevant deployment succeeds and the relevant live smoke test succeeds.
7. Keep production frozen: do not merge, deploy, alter production Worker/D1/payment settings, or change production data without explicit approval.
8. If a dependency or provider is unavailable, show **N/A / limited / unavailable**. Never replace missing evidence with fabricated scores, findings, stock, urgency, or success messages.
9. Changes to this rule itself require explicit user approval.

## Current task scope

The active issue is misleading category scores in the isolated SEO Audit Studio preview. Limit current edits to category evidence/scoring logic and its tests. Other working design, voucher, payment, and production flows remain frozen.

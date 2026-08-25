# NOVA AI POWER V6

NOVA AI POWER V6 is the owner-focused local AI agent layer for NexusNova.

## Goal
Make complex NexusNova, website, coding, research and new-app tasks much easier for a non-developer owner while keeping the default local model replaceable (`gpt-oss:20b`) and the download lightweight beyond the model itself.

## V6 pipeline
1. Router chooses Fast / Standard / Deep / Builder.
2. Planner creates execution steps and success criteria.
3. Context engine retrieves relevant project files/snippets before edits.
4. Worker executes with sandboxed tools.
5. Build/Test gate runs recognized allow-listed checks.
6. Reviewer verifies completion claims against structured tool evidence.
7. Critic checks missed requirements, regressions and unsafe broad edits.
8. Recovery loop can perform up to two focused correction passes.
9. Task journal stores local task summaries/evidence for future continuity.
10. GitHub publishing remains separately gated and never pushes directly to main.

## Modes
- Chat
- Web
- Research
- Website
- Dev
- App Builder
- Power

## App Builder
Creates projects under `generated-apps/`, inspects existing projects, edits files, runs recognized builds/checks, reviews diffs, commits on non-main branches and can prepare PRs after explicit GitHub-write arming.

## Safety
- Workspace sandbox; direct `.git` file manipulation blocked.
- No arbitrary shell tool exposed to the model.
- Only recognized npm / Python / Gradle build commands are allowed.
- Existing file backups/checkpoints are kept locally.
- Secrets are not stored in mobile memory.
- Never claim tests, deployment, traffic or results that were not actually verified.

V6 is not claimed to be GPT-5.6 Sol or a literal ChatGPT Plus clone. It is designed to be much more capable for NexusNova-specific owner workflows through orchestration, tools, persistent context and verification.

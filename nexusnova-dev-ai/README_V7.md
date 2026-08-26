# NOVA AI V7 PRO MAX — Local-First Power Upgrade

V7 is a safe additive layer on top of the existing V6 Ultimate + Work MAX stack. Existing V6 launchers and modules remain available as fallback.

## Goal
Push the local `gpt-oss:20b` brain further with stronger tools, retrieval and evidence workflows while keeping the recurring model subscription optional rather than required.

## V7 Pro tools
- `deep_research` — runs multiple public web searches, deduplicates results and fetches readable source text into one evidence pack.
- `knowledge_search` — broader local project retrieval using multiple terms, path bonuses, phrase matching and contextual snippets.
- `analyze_data` — read-only CSV/JSON analysis with schema, missing values, numeric statistics and common values; no arbitrary Python execution.

## Existing Work MAX capabilities kept
- Persistent named workspaces
- Objective, instructions, notes, tasks, source/reference files and artifacts
- Background local Work jobs while the PC/gateway is running
- Planner -> Worker -> verification -> Reviewer -> Red-Team Critic -> correction passes -> evidence finalizer
- Website, Dev, App Builder, Research and GitHub workflows
- Safe non-main branch behavior and GitHub write gates

## Start on Windows
1. Install/pull `gpt-oss:20b` with Ollama.
2. Ensure Python 3 is installed and available on PATH.
3. Double-click `START_NOVA_AI_V7.bat`.

The phone client continues to use the same local gateway port and pairing-token flow. A current Work MAX-capable mobile build is recommended.

## Cost model
Local Ollama inference itself does not require a per-message model subscription. Internet access, electricity and any optional third-party/cloud APIs or services can have their own costs/limits.

## Honest limits
V7 is not a copy of GPT-5.6 Sol or a proprietary ChatGPT cloud tier. Raw reasoning still depends heavily on `gpt-oss:20b` and the user's hardware. Some cloud-only capabilities cannot be reproduced for free/local use, especially always-on execution when the PC is off, proprietary image/video generation, proprietary connectors, and access to closed model weights.

The design target is functional usefulness: strong local reasoning orchestration, research, project/file work, coding, verification, durable Work state and optional online tools without breaking the working V6/Work MAX base.

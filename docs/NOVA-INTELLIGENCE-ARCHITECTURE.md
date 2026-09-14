# Nova Intelligence — Architecture Assessment and Production Hardening

Date: 14 September 2026
Branch: `feat/nova-intelligence-orchestration`

## Assessment

The legacy Intelligence page was a deterministic client-side capability router. It used a fixed capability list plus substring patterns and returned a preview-specific broad-request message when no pattern matched. That architecture was not suitable as a general-purpose assistant.

The repository is primarily a static website deployed from `main`, with a Cloudflare Worker already providing secure server-side routes. Cloudflare Builds deploys the Worker from `cloudflare/telegram-bot`; the new Nova entrypoint preserves the existing worker behind a narrow `/api/nova` surface.

An existing CI-only Python provider helper already demonstrated Gemini-first/OpenAI fallback, but it was not a production website runtime. The production hardening therefore introduces a JavaScript Worker-side provider adapter instead of exposing keys in the browser.

## Target architecture

Browser Nova UI
→ bounded session context
→ secure Cloudflare Worker `/api/nova`
→ provider-neutral AI adapter
→ structured plan
→ allowlisted NexusNova tools and/or web search
→ bounded execution
→ evidence-based synthesis
→ user-safe response

## Guarantees

- Provider secrets remain server-side.
- Gemini and OpenAI are replaceable adapters; either may be absent.
- Web search is only claimed when a configured search capability actually runs.
- Tool execution is allowlisted and bounded.
- Same-origin handoff destinations are explicit, not model-supplied arbitrary URLs.
- User context is bounded to the latest eight messages and is kept in browser session storage.
- Request and message sizes are bounded.
- Provider and tool failures return an honest recovery path rather than raw technical errors.
- Retrieved web/tool content is treated as data, not instructions.
- Browser output uses DOM text nodes rather than HTML interpolation for user-controlled content.
- The Intelligence page remains `noindex,nofollow`.

## Zero-cost / graceful degradation

No paid model is an unconditional dependency. When no AI provider is configured, Nova still exposes native NexusNova fallbacks and explicit tool handoffs. It never fabricates an AI response. When a provider is configured but fails, the runtime attempts the alternate provider before falling back.

## Current connected capability layer

Native server execution currently includes safe arithmetic and the repository's daily currency reference dataset. Browser-oriented tools are exposed through explicit internal handoffs because they require their own UI/file inputs and should not be simulated server-side.

## Release gate

A production release is not considered fully AI-enabled merely because the code is merged. `/api/nova/status` must report an AI provider configured in the deployed Worker, and browser QA must verify the live request path without dead-end technical errors.

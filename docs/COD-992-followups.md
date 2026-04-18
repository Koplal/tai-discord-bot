# COD-992 Follow-up Tickets

Drafted 2026-04-18. Review and file manually in Linear.

---

## Ticket 1 — Migrate tai-discord-bot to claude-sonnet-4-6

**Team:** Coding Fox AI
**Labels:** tech-debt
**Priority:** Medium
**Due:** 2026-06-15

### Context

`MODEL_ID` in `src/services/agent.ts` is currently pinned to `claude-sonnet-4-20250514`. The constant was extracted in COD-992 specifically to make this migration a one-line change. `claude-sonnet-4-6` is the current production-recommended model and should be adopted before the June release window.

### Acceptance Criteria

- `MODEL_ID` constant updated to `'claude-sonnet-4-6'` in `src/services/agent.ts`
- All 71 unit tests pass with the new model ID (tests reference the string via fixtures, so fixture must also be updated)
- Smoke test against staging Discord server confirms response quality parity with `claude-sonnet-4-20250514`
- No hardcoded model strings remain in production source files (only in test fixtures)

---

## Ticket 2 — Enforce maxTokensPerDay from role permissions

**Team:** Coding Fox AI
**Labels:** security, backend
**Priority:** Medium

### Context

`rate-limiter.ts` defines per-tier daily token limits (free: 50 000, premium: 500 000, admin: unlimited) but does not currently enforce them — only per-minute request counts are enforced. Tokens are tracked in `AgentResponse.tokensUsed` but not persisted or checked against the daily cap. This is a security gap that allows unlimited spend from a single user across a 24-hour window.

### Acceptance Criteria

- Per-user daily token counter persisted in Redis (preferred) or in-memory with UTC midnight reset
- Counter incremented by `response.tokensUsed` after every successful `processAgentRequest` call
- Requests that would exceed the daily limit return HTTP 429 with a human-readable Discord message (e.g., "You have reached your daily token limit. Resets at midnight UTC.")
- Admin tier remains uncapped
- Counter reset mechanism confirmed to fire at UTC midnight (cron or TTL-based)
- Unit tests cover: under-limit (pass), at-limit (pass), over-limit (reject), admin bypass

---

## Ticket 3 — Rate-limiter: vision-aware per-token accounting

**Team:** Coding Fox AI
**Labels:** enhancement
**Priority:** Low
**Depends on:** Ticket 2 (enforce maxTokensPerDay)

### Context

Image inputs consume significantly more tokens than text due to vision encoding overhead. Once Ticket 2's daily counter is in place, the leaky-bucket rate limiter should weight requests by actual token cost rather than treating all requests equally. This prevents a user from exhausting their daily budget in a handful of image-heavy requests while the per-minute request counter still passes.

### Acceptance Criteria

- Leaky-bucket in `rate-limiter.ts` consumes `response.usage.total_tokens` (or equivalent) per request instead of a flat cost
- Free-tier bucket depth and refill rate recalculated to remain equivalent for text-only users
- Vision requests that produce high token counts drain the bucket proportionally
- Unit tests cover: text request (normal drain), image request (higher drain), bucket empty (reject)
- Existing per-minute request limit tests remain green

---

## Ticket 4 — Content moderation layer for user-attached images

**Team:** Coding Fox AI
**Labels:** security
**Priority:** Medium

### Context

COD-992 enables users to attach images to `@TAIBot` mentions and `/tai ask` commands. These images are forwarded as Discord CDN URLs directly to the Anthropic API. No pre-screening of image content occurs. This creates risk of policy-violating content being processed and potentially reflected in bot responses visible to the whole channel.

### Acceptance Criteria

- Evaluate Discord's built-in attachment flags (`isSpoiler()`, content-type checks) as a first-pass filter
- Design and document a pre-forward moderation hook interface (does not need to call an external moderation API in v1 — a pluggable interface is sufficient)
- Default behavior on ambiguous or unscreenable attachments: skip the image block and prepend a note to Claude ("image attachment could not be verified, proceeding text-only")
- Spoiler-tagged images are silently dropped (already partially implemented via `isSpoiler()` check in `messageCreate.ts` — confirm and test)
- Unit tests cover: clean attachment (pass through), spoiler attachment (drop), unsupported content-type (drop)
- Decision documented in ADR or inline comment: which moderation signals are checked and why

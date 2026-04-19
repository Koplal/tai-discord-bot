# Changelog

All notable changes to the TAI Discord Bot.

## [Unreleased]

### Added
- Image/vision support for `@TAIBot` mentions and `/tai ask` slash command: up to 2 image attachments forwarded as Anthropic `type:"image"` URL-source content blocks (COD-992)
- `ENABLE_VISION` environment flag (`true` by default) for instant rollback of vision feature without a redeploy (COD-992)
- Vitest test runner with 71 unit tests across `src/__tests__/`, `src/__fixtures__/`, and `src/__integration__/` (COD-992)
- `scrubDiscordCdnUrls` log-hygiene helper (`src/lib/log-scrub.ts`) — strips CDN tokens from log output to prevent credential leaks (COD-992)
- Integration tests T29 (vision) and T30 (15-message context) in `src/__integration__/` (COD-992)
- `test-fixtures/vision-test.png` — 8×8 solid-red PNG used by T29 vision integration test
- `.github/workflows/test.yml` — CI job running unit tests + build on every PR and push
- Integration test run instructions in `deploy/README.md`
- `list_issue_comments` tool to read Linear issue comment threads (COD-503)
- Recent comments shown in `get_linear_issue` detailed responses
- Discord thread and reply chain context awareness
- `Partials.Message` and `Partials.ThreadMember` for uncached thread/reply support
- Reply chain walking (up to 5 levels) with partial message hydration
- Thread-aware context collection for `/tai` slash commands
- `list_linear_cycles` tool to query current and upcoming sprint cycles
- T-shirt size estimates (XS/S/M/L/XL) replacing Fibonacci points
- Section 9 (TAI Bot Linear Tools) in linear-usage-guide.md
- TAI Bot anti-patterns documentation
- Linear tools reference table in CLAUDE.md
- Linear Issue Fields table documenting all field types
- Milestone field type documentation

### Changed
- Message history context window bumped from 10 to 15 messages (COD-992)
- `max_tokens` increased from 1024 to 2048 to support richer vision responses (COD-992)
- Extracted `MODEL_ID` constant at top of `src/services/agent.ts` — no longer inlined at call sites (COD-992)
- Reconciled `AgentRequest` / `AgentResponse` type duplication: `AgentRequest` now lives solely in `agent.ts`, dead re-export removed from `types.ts` (COD-992)
- Estimates now use T-shirt sizes: XS=1, S=2, M=3, L=5, XL=8
- Updated system prompt with cycle tool and estimate syntax
- Clarified distinction between cycles (sprints) and labels (tags)

## [1.0.0] - 2026-01-22

### Added
- Initial release with Claude-powered Discord bot
- Linear integration: create, search, get, list, update issues
- Add comments to Linear issues
- List users, labels, projects from Linear
- Additive label updates (preserves existing labels)
- Role-based access control (free/premium/admin tiers)
- Rate limiting with token bucket algorithm
- Message context collection for conversational awareness

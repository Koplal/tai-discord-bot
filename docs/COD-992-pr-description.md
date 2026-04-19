## Summary

Implements COD-992 (image/vision support for TAIBOT) and bumps conversation context from 10 to 15 messages. Two coordinated changes shipped together because they share the same files and type signatures.

## Changes

- `@TAIBot` mentions and `/tai ask` now accept up to 2 image attachments.
- Images forwarded as Anthropic `type:"image"` URL-source content blocks (no download/base64).
- Message history context expanded 10 → 15.
- New `ENABLE_VISION` flag for instant rollback (see `.env.example`).
- Introduced vitest + 71 unit tests (no test infra existed before).
- New `scrubDiscordCdnUrls` helper; log sites scrubbed to prevent CDN token leaks.
- Type cleanup: deleted dead `AgentRequest` from `types.ts`, reconciled `AgentResponse` duplication.

## Fixed decisions (from plan)

1. Image cap per request: 2
2. Non-image attachments: silent drop
3. Daily token enforcement: deferred (follow-up ticket)
4. max_tokens: 1024 → 2048
5. Spoiler attachments: honored (skipped)
6. Test runner: vitest
7. Model: claude-sonnet-4-20250514 (migration to sonnet-4-6 is follow-up ticket)
8. Image transport: Discord CDN URL → Anthropic URL source

## Follow-up tickets

See `docs/COD-992-followups.md` for four drafted tickets.

## Test plan

- [ ] `@TAIBot what is in this image?` + PNG → response describes image
- [ ] `@TAIBot hi` (no attachment) → text-only (regression)
- [ ] `/tai ask prompt:"..." image:<png>` → response describes image
- [ ] `/tai ask prompt:"hi"` (no image) → text-only
- [ ] Post 15 user messages, `@TAIBot summarize` → includes first message
- [ ] `ENABLE_VISION=false` restart → image mentions behave as text-only (rollback hotfix works)
- [ ] `/tai ask` UI shows `image` option in test guild (confirms `npm run register` ran)
- [ ] CI: `npm run test` + `npm run build` pass

## Rollback

Instant: `ENABLE_VISION=false` in systemd env + `systemctl restart`.
Full: `git revert <merge-sha>` + redeploy.

## Not in scope

- Model migration to claude-sonnet-4-6 (ticket)
- Daily token enforcement (ticket)
- Content moderation layer (ticket)

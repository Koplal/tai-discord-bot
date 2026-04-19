# TAI Discord Bot

Claude-powered Discord bot for the TAI team. Supports natural-language conversation via `@TAIBot` mentions and the `/tai` slash command, with deep integration into Linear for task automation.

## Features

- **Conversational AI** — mention `@TAIBot` or use `/tai ask` to chat with Claude Sonnet 4 directly in Discord.
- **Image / vision support** — attach up to 2 images per message; Claude sees them and reasons over their content. Supports PNG, JPEG, GIF (first frame), and WebP.
- **Linear integration** — create, search, update, and comment on Linear issues; list users, labels, projects, and cycles. Premium/admin-gated.
- **Conversation context** — automatically includes the last 15 messages from the channel, thread, or reply chain when you invoke the bot.
- **Rate limiting + role-based access** — token-bucket rate limiter; free / premium / admin tiers via Discord roles.
- **Rollback flag** — `ENABLE_VISION=false` instantly disables vision at runtime without a redeploy.
- **Log hygiene** — Discord CDN signed URLs are scrubbed from all log output.

## Recent Changes

See [CHANGELOG.md](./CHANGELOG.md) for the full log. Highlights since v1.0.0:

- **Vision support (COD-992)** — images attached to Discord messages are forwarded to Anthropic as `type:"image"` URL-source content blocks, no download or base64 encoding needed.
- **Context window: 10 → 15 messages** for richer conversational memory.
- **vitest test suite** — 71 unit tests + 2 opt-in integration tests, no test infrastructure existed before.
- **CI on every PR** — `.github/workflows/test.yml` runs `npm run test` + `npm run build`.
- **Auto-deploy slash-command registration** — the GCP deploy workflow now runs `npm run register` automatically before each restart.
- **Migrated from Railway to Google Cloud Free Tier e2-micro VM** with systemd + GitHub Actions auto-deploy.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js 22+ |
| Language | TypeScript (strict) |
| Framework | discord.js v14 |
| AI | Anthropic Claude Sonnet 4 (`@anthropic-ai/sdk` v0.39.0) |
| Testing | vitest |
| Hosting | Google Cloud Free Tier (e2-micro VM) |
| Deploy | GitHub Actions → SSH into VM → systemd restart |
| Project management | Linear GraphQL API |

## Project Structure

```
src/
├── index.ts                   # Entry point, Client setup
├── types.ts                   # Shared types, messageToContext builder
├── commands/
│   ├── tai.ts                 # /tai slash command definition
│   └── register.ts            # One-shot command registration script
├── events/
│   ├── ready.ts               # Bot ready handler
│   ├── messageCreate.ts       # @TAIBot mention handler
│   ├── interactionCreate.ts   # Slash command handler
│   └── imageFilter.ts         # Shared image attachment filter
├── services/
│   ├── agent.ts               # Claude agent with Linear tools + vision
│   ├── linear-client.ts       # Linear GraphQL client
│   ├── context-collector.ts   # Message history collection
│   └── response-formatter.ts  # Discord markdown formatter
├── lib/
│   ├── env-flags.ts           # isVisionDisabled() feature flag helper
│   └── log-scrub.ts           # scrubDiscordCdnUrls() log hygiene
├── middleware/
│   ├── rate-limiter.ts        # Token-bucket rate limiting
│   └── permissions.ts         # Role-based access control
├── __fixtures__/              # Shared test fixtures (discord, anthropic)
├── __tests__/                 # Sanity + SDK verification tests
└── __integration__/           # Opt-in integration tests (real API)
```

## Local Development

### Prerequisites

- Node.js 22 or later
- A Discord application + bot (see [Discord Developer Portal](https://discord.com/developers/applications))
- An Anthropic API key
- A Linear API key + team ID (optional, required only for Linear tools)

### Setup

```bash
git clone https://github.com/Koplal/tai-discord-bot.git
cd tai-discord-bot
npm install
cp .env.example .env
# edit .env with your tokens
npm run register   # register slash commands once
npm run dev        # start with hot reload via tsx watch
```

### Common scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Run with hot reload (`tsx watch`) |
| `npm run build` | TypeScript compile to `dist/` |
| `npm start` | Run compiled build |
| `npm run register` | Register/update slash commands with Discord |
| `npm run test` | Run unit tests (vitest) |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:integration` | Run opt-in integration tests (needs `ANTHROPIC_API_KEY`) |
| `npm run typecheck` | Typecheck without emit |
| `npm run lint` | ESLint |

### Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_BOT_TOKEN` | Yes | Bot token from Discord Developer Portal |
| `DISCORD_CLIENT_ID` | Yes | Application ID |
| `DISCORD_GUILD_ID` | Yes | Server ID for slash command registration |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key |
| `LINEAR_API_KEY` | Yes | Linear API key (required by current schema; Linear tools are tier-gated) |
| `LINEAR_TEAM_ID` | Yes | Linear team UUID |
| `ENABLE_VISION` | No | `true` (default) or `false`/`0`/`no`/`off` to disable vision |
| `REDIS_URL` | No | Reserved for future distributed rate limiting |

## Deployment

Production runs on Google Cloud Free Tier (e2-micro VM, Ubuntu 22.04, us-central1). Detailed VM-setup instructions live in [deploy/README.md](./deploy/README.md). This section is a high-level overview.

### Auto-deploy pipeline

```
git push origin main
   ↓
.github/workflows/deploy.yml (triggered on push to main)
   ↓
appleboy/ssh-action SSHes into GCP VM
   ↓
cd /opt/tai-discord-bot
   ↓
git pull → npm ci → tsc → npm prune --omit=dev
   ↓
npm run register  (updates slash command schemas with Discord)
   ↓
sudo systemctl restart tai-discord-bot
```

### Required GitHub Secrets

Set these in **Settings → Secrets and variables → Actions**:

| Secret | Value |
|--------|-------|
| `GCP_HOST` | VM external IP |
| `GCP_USER` | SSH user |
| `GCP_SSH_KEY` | Private SSH key with access to the VM |

### Rollback

- **Instant hotfix (no redeploy):** edit `/opt/tai-discord-bot/.env` on the VM, set `ENABLE_VISION=false`, run `sudo systemctl restart tai-discord-bot`. Resolves vision-related failures in under 30 seconds.
- **Full revert:** `git revert <merge-sha>` on `main` → auto-deploy fires on push.

### Monitoring

```bash
# Live logs
journalctl -u tai-discord-bot -f

# Recent 100 lines
journalctl -u tai-discord-bot -n 100

# Status
systemctl status tai-discord-bot
```

## Fork / Adapt for Another Discord Server

The bot is written to be single-guild (set via `DISCORD_GUILD_ID`). To run a copy on a different server:

1. **Fork or clone** this repo to your own GitHub account.
2. **Create a new Discord application** at [https://discord.com/developers/applications](https://discord.com/developers/applications):
   - Create the bot user under **Bot → Add Bot**.
   - Enable intents: **Message Content**, **Server Members**, **Presence** (the `MessageContent` intent is privileged — toggle it on).
   - Under **OAuth2 → URL Generator**, select scopes `bot` + `applications.commands`, then select bot permissions `Send Messages`, `Read Message History`, `Embed Links`, `Attach Files`, `Use Slash Commands`. Copy the generated URL and invite the bot to your server.
3. **Grab the three Discord IDs** and add them to your `.env`:
   - `DISCORD_BOT_TOKEN` from **Bot → Reset Token**
   - `DISCORD_CLIENT_ID` from **General Information → Application ID**
   - `DISCORD_GUILD_ID` from your server (enable Developer Mode in Discord, right-click server → Copy Server ID)
4. **Get API keys:** Anthropic from [console.anthropic.com](https://console.anthropic.com), Linear from [linear.app/settings/api](https://linear.app/settings/api). If you do not need Linear tools, see the "Removing Linear" note below.
5. **Customize tier mapping** — edit `src/middleware/permissions.ts` to map your server's Discord role IDs to free / premium / admin tiers.
6. **Customize the system prompt** — edit `SYSTEM_PROMPT` near the top of `src/services/agent.ts`. The bot's personality, tool list, and behavior are defined there.
7. **Deploy:** for personal use, a cheap always-on runtime (Railway, Render, Fly.io, or a GCP free-tier VM like this repo uses) is sufficient. For the GCP path, follow [deploy/README.md](./deploy/README.md). The repo's existing `.github/workflows/deploy.yml` assumes the three `GCP_*` secrets — update or replace the workflow to match your chosen host.
8. **Register slash commands** — run `npm run register` once locally, or let the deploy workflow do it automatically on every push.

### Removing Linear

If Linear is not relevant to your fork:

- Delete `src/services/linear-client.ts` and remove its imports from `src/services/agent.ts`.
- Remove `LINEAR_API_KEY` + `LINEAR_TEAM_ID` from `.env.example`, `src/types.ts` config loader, and `package.json` types.
- Strip the Linear tool definitions from the `tools` array in `agent.ts` and from `SYSTEM_PROMPT`.

The vision, conversation, and context-collection features work standalone.

## Adapting for Slack (or Other Chat Platforms)

The bot's core logic — agent loop, context building, image filtering, rate limiting, log scrubbing, feature flags — is platform-agnostic and can be reused. The transport layer (events, commands, attachments) is Discord-specific and would need replacement.

**What ports cleanly:**

| Module | Platform-agnostic? |
|--------|--------|
| `src/services/agent.ts` | Yes — takes a plain `AgentRequest` object, returns `AgentResponse`. Pass it anything. |
| `src/services/context-collector.ts` | Partial — collects from a `TextBasedChannel` (discord.js type). Replace with a Slack-history fetcher that returns the same `ContextMessage[]` shape. |
| `src/services/linear-client.ts` | Yes — pure GraphQL, no Discord coupling. |
| `src/middleware/rate-limiter.ts`, `permissions.ts` | Yes — swap user-id source. |
| `src/lib/log-scrub.ts`, `env-flags.ts` | Yes. |
| `src/types.ts` `messageToContext` | Partial — takes a `discord.js` `Message`. Write a `slackMessageToContext` variant that produces the same `ContextMessage`. |
| Vision payload shape | Yes — `type:"image"` URL-source blocks work regardless of platform, as long as you can get a publicly-reachable URL for the attachment. |

**What needs a full rewrite:**

| Module | Replacement |
|--------|--------|
| `src/index.ts` | Replace `discord.js` `Client` setup with Slack [Bolt SDK](https://slack.dev/bolt-js/) `App`. |
| `src/events/messageCreate.ts` | Replace with Bolt `app.event('app_mention', ...)` handler. |
| `src/events/interactionCreate.ts` | Replace with Bolt `app.command('/tai', ...)` handler. |
| `src/commands/tai.ts` + `register.ts` | Slack slash commands are registered via the Slack app manifest, not a runtime script. Move to an app manifest YAML. |
| `src/events/imageFilter.ts` | Slack file uploads have a different shape (`file.mimetype`, `file.url_private`, requires auth header to download). If you keep URL-source vision, you may need to proxy Slack URLs through a public endpoint or download + base64 (Anthropic accepts both). |

### High-level steps to port to Slack

1. `npm uninstall discord.js && npm install @slack/bolt`.
2. Create a Slack app at [api.slack.com/apps](https://api.slack.com/apps):
   - **Enable Events API**, subscribe to `app_mention`, `message.channels`, and `file_shared` events.
   - **Enable Socket Mode** (easiest for dev) or configure a public webhook URL.
   - **Register slash commands** via the app manifest.
   - **OAuth scopes:** `app_mentions:read`, `channels:history`, `chat:write`, `commands`, `files:read`.
3. Rewrite `src/index.ts` to initialize a Bolt `App` with the Slack tokens.
4. Create `src/events/appMention.ts` and `src/events/slashCommand.ts` mirroring the Discord handlers. Call the same `processAgentRequest` from `agent.ts`.
5. Create a Slack-aware context collector that uses `client.conversations.history` to fetch the last 15 messages and maps them into `ContextMessage[]`.
6. Handle Slack attachments: fetch the `file.url_private_download` with the bot token (Slack files are auth-gated), then either (a) re-upload to a public URL you control and pass that to Anthropic, or (b) download + base64 and send as a base64-source image block. The current agent uses URL-source — base64 is straightforward to add by extending `ImageAttachment` with an optional `data` field and branching inside `buildMessages`.
7. Ship with the same test philosophy: fixtures for Slack events under `src/__fixtures__/slack.fixtures.ts`, keep existing vitest structure.

This is a meaningful effort (est. ~1-2 weeks for a single engineer), but the AI-side logic you'd want to preserve (agent loop, context management, tool calling, vision) is ~80% of the value and does not need to change.

## Testing

```bash
# Unit tests (71 tests, fast)
npm run test

# Integration tests (hit real Anthropic API, cost real tokens)
RUN_INTEGRATION_TESTS=1 ANTHROPIC_API_KEY=<key> npm run test:integration
```

Tests are colocated with source files (`src/**/*.test.ts`). Integration tests live under `src/__integration__/` and are gated by `RUN_INTEGRATION_TESTS=1`.

CI (`.github/workflows/test.yml`) runs `npm run test` + `npm run build` on every PR and push. Integration tests are skipped in CI.

## Security Notes

- **API keys** are read from environment variables only; never hardcoded.
- **Discord CDN signed URLs** contain auth tokens with ~24h TTL. These are automatically scrubbed from log output by `scrubDiscordCdnUrls` (`src/lib/log-scrub.ts`).
- **Rate limiting** prevents abuse; tier-gated access via Discord roles.
- **`ENABLE_VISION=false`** is a kill-switch — if Anthropic ever rejects Discord CDN URLs, an operator can disable vision in <30s without a redeploy.
- **Private team bot posture:** this bot is designed for a trusted team Discord; it does not include NSFW/CSAM content moderation. If exposing to untrusted users, add a moderation hook before forwarding attachments to Anthropic. See `docs/COD-992-followups.md` for the tracked follow-up.

## Contributing

Branch naming: `<type>/<description>` (e.g., `feature/add-xyz`, `fix/something-broken`).

Commit convention: `type(scope): description` — see recent commits for examples.

All changes go through a PR to `main`. CI must pass before merge.

## License

MIT — see [LICENSE](./LICENSE) (if present) or [package.json](./package.json).

## Links

- **Linear:** [COD-XXX tickets in Coding Fox AI](https://linear.app/coding-fox-ai)
- **Deploy docs:** [deploy/README.md](./deploy/README.md)
- **Changelog:** [CHANGELOG.md](./CHANGELOG.md)
- **Project context for Claude Code:** [CLAUDE.md](./CLAUDE.md)

# TAI Discord Bot - Project Context

Discord bot that enables Claude-powered task automation for the TAI team.

Linear Ticket: COD-379

## Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js 22+ |
| Framework | discord.js v14 |
| Language | TypeScript |
| Hosting | Railway ($5-10/month) |
| Auth | HMAC-SHA256 signatures |

## Architecture

```
Discord Server
    ↓ @TAIBot mention or /tai command
Discord Bot (this repo)
    ↓ HTTPS POST with HMAC signature
TAI Backend (/api/discord-agent)
    ↓ Claude Agent with tools
MCP Servers (Linear, Supabase, Notion)
```

## Project Structure

```
src/
├── index.ts                 # Entry point, client setup
├── types.ts                 # TypeScript types, config loader
├── commands/
│   ├── tai.ts               # /tai slash command definition
│   └── register.ts          # Command registration script
├── events/
│   ├── ready.ts             # Bot ready handler
│   ├── messageCreate.ts     # @TAIBot mention handler
│   └── interactionCreate.ts # Slash command handler
├── services/
│   ├── agent-client.ts      # TAI backend API client
│   ├── context-collector.ts # Message history collector
│   └── response-formatter.ts# Discord markdown formatter
└── middleware/
    ├── rate-limiter.ts      # Token bucket rate limiting
    └── permissions.ts       # Role-based access control
```

## Commands

| Command | Description | Access |
|---------|-------------|--------|
| `/tai ask <prompt>` | General questions | All users |
| `/tai create-issue <desc>` | Create Linear issues | Members+ |
| `/tai query <sql>` | Query Supabase (read-only) | Admins |
| `/tai search <query>` | Search Notion docs | All users |
| `@TAIBot <message>` | Conversational requests | All users |

## Development

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Register slash commands (once)
pnpm register

# Run in development
pnpm dev

# Build for production
pnpm build

# Run production build
pnpm start
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| DISCORD_BOT_TOKEN | Bot token from Discord Developer Portal | Yes |
| DISCORD_CLIENT_ID | Application ID | Yes |
| DISCORD_GUILD_ID | Server ID for command registration | Yes |
| TAI_API_URL | TAI backend URL | Yes |
| TAI_DISCORD_SECRET | Shared secret for HMAC signing | Yes |
| REDIS_URL | Redis URL for distributed rate limiting | No |

## Rate Limits

| Tier | Requests/min | Daily Tokens |
|------|-------------|--------------|
| Free | 10 | 50,000 |
| Premium | 60 | 500,000 |
| Admin | 1000 | Unlimited |

## Deployment (Railway)

1. Connect GitHub repo to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push to main

## Security

- Bot token stored in environment variables only
- HMAC-SHA256 signature validation for all API requests
- Role-based access control via Discord roles
- Rate limiting to prevent abuse

## Related

- TAI Main App: CodingFox-AI/tai-app
- Linear: COD-379
- Backend endpoint: /api/discord-agent (to be implemented in tai-app)

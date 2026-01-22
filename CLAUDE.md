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
| AI | Anthropic Claude (claude-sonnet-4-20250514) |
| Project Management | Linear GraphQL API |

## Architecture

```
Discord Server
    ↓ @TAIBot mention or /tai command
Discord Bot (this repo)
    ├─→ Claude API (direct)
    │       └─→ Tool use for Linear operations
    └─→ Linear GraphQL API (direct)
```

The bot calls Claude and Linear APIs directly, without a backend proxy.

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
│   ├── agent.ts             # Claude agent with Linear tools
│   ├── linear-client.ts     # Linear GraphQL API client
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
| `/tai create-issue <desc>` | Create Linear issues | Premium+ |
| `@TAIBot <message>` | Conversational requests | All users |

Premium+ users get access to Linear tools (create/search issues, cycles).

## Linear Tools

| Tool | Description |
|------|-------------|
| `create_linear_issue` | Create new issues |
| `search_linear_issues` | Search by keywords |
| `get_linear_issue` | Get issue details (COD-XXX) |
| `list_linear_issues` | List recent issues |
| `update_linear_issue` | Update status/priority/assignee/labels/cycle |
| `add_linear_comment` | Add comments |
| `list_linear_users` | List team members |
| `list_linear_labels` | List available labels |
| `list_linear_projects` | List projects |
| `list_linear_cycles` | List current/upcoming sprints |

## Linear Issue Fields

Issues have these distinct field types (not interchangeable):

| Field | Type | Description |
|-------|------|-------------|
| Status | Workflow state | backlog, todo, in_progress, done, canceled |
| Priority | Numeric (0-4) | urgent, high, medium, low, none |
| Assignee | User | Team member responsible |
| Labels | Tags | Type (bug/feature), status (blocked) |
| Project | Container | Groups related issues |
| Cycle | Sprint | 2-week work periods (current/upcoming) |
| Estimate | Points | T-shirt size (XS/S/M/L/XL) |

## Estimates

Use T-shirt sizes (not Fibonacci):

| Size | Points | Time |
|------|--------|------|
| XS | 1 | < 2 hours |
| S | 2 | Half day |
| M | 3 | 1 day |
| L | 5 | 2-3 days |
| XL | 8 | ~1 week (decompose) |

## Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Register slash commands (once)
npm run register

# Run in development
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| DISCORD_BOT_TOKEN | Bot token from Discord Developer Portal | Yes |
| DISCORD_CLIENT_ID | Application ID | Yes |
| DISCORD_GUILD_ID | Server ID for command registration | Yes |
| ANTHROPIC_API_KEY | Anthropic API key for Claude | Yes |
| LINEAR_API_KEY | Linear API key | Yes |
| LINEAR_TEAM_ID | Linear team UUID | Yes |
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

- API keys stored in environment variables only
- Role-based access control via Discord roles
- Rate limiting to prevent abuse
- Free tier users cannot access Linear tools

## Related

- Linear: COD-379
- GitHub: Koplal/tai-discord-bot

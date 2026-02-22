# Google Cloud Deployment

TAI Discord Bot runs on a Google Cloud Free Tier e2-micro VM with auto-deploy via GitHub Actions.

## VM Setup (One-Time)

### 1. Create Google Cloud VM

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable Compute Engine API
4. Create a VM instance:
   - Name: `tai-discord-bot`
   - Region: **us-central1** (or us-west1/us-east1 — must be US for free tier)
   - Machine type: **e2-micro** (2 vCPU, 1 GB RAM — free tier eligible)
   - Boot disk: **Ubuntu 22.04 LTS**, 30 GB standard persistent disk
   - Under "Advanced > Management > Metadata", add your SSH key
5. Note the external IP address

### 2. Firewall

The bot is **outbound-only** (connects to Discord, Claude, and Linear APIs). No inbound ports need to be opened beyond SSH (port 22) for deployment.

GCP allows SSH by default. No firewall rule changes needed.

### 3. Run Setup Script

SSH into the VM and run:

```bash
# SSH via gcloud CLI or directly
gcloud compute ssh tai-discord-bot --zone=us-central1-a
# or: ssh <username>@<VM_EXTERNAL_IP>

# Clone the repo first (setup.sh is inside it)
sudo git clone https://github.com/Koplal/tai-discord-bot.git /opt/tai-discord-bot
cd /opt/tai-discord-bot

# Run setup
sudo bash deploy/setup.sh
```

### 4. Configure Environment

```bash
sudo nano /opt/tai-discord-bot/.env
```

Add all required variables:

```
DISCORD_BOT_TOKEN=...
DISCORD_CLIENT_ID=...
DISCORD_GUILD_ID=...
ANTHROPIC_API_KEY=...
LINEAR_API_KEY=...
LINEAR_TEAM_ID=...
```

### 5. Start the Bot

```bash
sudo systemctl start tai-discord-bot
```

## GitHub Actions Auto-Deploy

On every push to `main`, the deploy workflow SSHes into the VM and restarts the bot.

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `GCP_HOST` | VM external IP address |
| `GCP_USER` | SSH user |
| `GCP_SSH_KEY` | Private SSH key for the VM |

Set these in **Settings > Secrets and variables > Actions** in the GitHub repo.

## Free Tier Notes

The Google Cloud Always Free tier includes:
- 1 e2-micro instance (us-central1, us-west1, or us-east1)
- 30 GB standard persistent disk
- 1 GB outbound data transfer/month (sufficient for a Discord bot)

This does **not** expire — it's free as long as you stay within the limits. You do need a billing account enabled, but it won't be charged while within free tier.

## Common Commands

```bash
# View live logs
journalctl -u tai-discord-bot -f

# View recent logs (last 100 lines)
journalctl -u tai-discord-bot -n 100

# Restart the bot
sudo systemctl restart tai-discord-bot

# Stop the bot
sudo systemctl stop tai-discord-bot

# Check status
systemctl status tai-discord-bot

# Manual deploy (if GitHub Actions is down)
cd /opt/tai-discord-bot
sudo -u discordbot git pull
sudo -u discordbot npm ci --omit=dev
sudo -u discordbot npm run build
sudo systemctl restart tai-discord-bot
```

## Troubleshooting

- **Bot won't start:** Check `.env` file exists and has all required variables
- **Permission errors:** Ensure `/opt/tai-discord-bot` is owned by `discordbot:discordbot`
- **Build fails:** Verify Node.js 22+ is installed (`node -v`)
- **Deploy action fails:** Verify GitHub secrets are set and SSH key has access
- **OOM issues:** e2-micro has 1 GB RAM — monitor with `free -h`. Node.js + discord.js typically uses 100-300 MB so this should be fine

#!/usr/bin/env bash
set -euo pipefail

# TAI Discord Bot - One-time server setup script
# Run as root on a fresh Ubuntu 22.04+ ARM VM

APP_DIR="/opt/tai-discord-bot"
SERVICE_USER="discordbot"
REPO_URL="https://github.com/Koplal/tai-discord-bot.git"

echo "==> Installing Node.js 22 via NodeSource..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

echo "==> Node version: $(node -v)"
echo "==> npm version: $(npm -v)"

echo "==> Creating system user '${SERVICE_USER}'..."
if ! id "$SERVICE_USER" &>/dev/null; then
    useradd --system --shell /usr/sbin/nologin --home-dir "$APP_DIR" "$SERVICE_USER"
fi

echo "==> Cloning repo to ${APP_DIR}..."
if [ -d "$APP_DIR" ]; then
    echo "    Directory already exists, pulling latest..."
    cd "$APP_DIR"
    git pull
else
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

echo "==> Installing dependencies and building..."
npm ci
npm run build
npm prune --omit=dev

echo "==> Setting ownership..."
chown -R "$SERVICE_USER":"$SERVICE_USER" "$APP_DIR"

echo "==> Installing systemd service..."
cp deploy/tai-discord-bot.service /etc/systemd/system/tai-discord-bot.service
systemctl daemon-reload
systemctl enable tai-discord-bot

echo ""
echo "============================================"
echo "  Setup complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Create the .env file:"
echo "     sudo nano ${APP_DIR}/.env"
echo ""
echo "  2. Add these variables:"
echo "     DISCORD_BOT_TOKEN=..."
echo "     DISCORD_CLIENT_ID=..."
echo "     DISCORD_GUILD_ID=..."
echo "     ANTHROPIC_API_KEY=..."
echo "     LINEAR_API_KEY=..."
echo "     LINEAR_TEAM_ID=..."
echo ""
echo "  3. Start the bot:"
echo "     sudo systemctl start tai-discord-bot"
echo ""
echo "  4. Check logs:"
echo "     journalctl -u tai-discord-bot -f"
echo ""

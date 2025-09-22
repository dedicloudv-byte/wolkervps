#!/bin/bash

# Cloudflare Telegram Bot Update Script

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo -e "${GREEN}🔄 Updating Cloudflare Telegram Bot...${NC}"

# Backup current state
echo -e "${YELLOW}📦 Creating backup...${NC}"
./backup-bot.sh

# Stop the bot
echo -e "${YELLOW}⏹️  Stopping bot...${NC}"
pm2 stop cloudflare-telegram-bot 2>/dev/null || true

# Update from git (if it's a git repository)
if [ -d ".git" ]; then
    echo -e "${YELLOW}📥 Pulling latest changes...${NC}"
    git pull origin main
fi

# Update dependencies
echo -e "${YELLOW}📦 Updating dependencies...${NC}"
npm update

# Restart the bot
echo -e "${YELLOW}🔄 Restarting bot...${NC}"
pm2 restart cloudflare-telegram-bot

# Save PM2 configuration
pm2 save

echo ""
echo -e "${GREEN}✅ Update completed successfully!${NC}"
echo ""
echo "📊 Status:"
pm2 status cloudflare-telegram-bot
echo ""
echo "📋 Check logs: pm2 logs cloudflare-telegram-bot"
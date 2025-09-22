#!/bin/bash

# Cloudflare Telegram Bot Startup Script

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo -e "${GREEN}🚀 Starting Cloudflare Telegram Bot...${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Please copy .env.example to .env and configure it:"
    echo "  cp .env.example .env"
    echo "  nano .env"
    exit 1
fi

# Check if .env is configured
if grep -q "YOUR_" .env; then
    echo -e "${RED}❌ .env file is not configured!${NC}"
    echo "Please edit .env file and add your credentials:"
    echo "  TELEGRAM_BOT_TOKEN=your_bot_token"
    echo "  CLOUDFLARE_ACCOUNT_ID=your_account_id"
    echo "  CLOUDFLARE_API_TOKEN=your_api_token"
    exit 1
fi

# Create necessary directories
mkdir -p logs data

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📦 PM2 not found, installing...${NC}"
    npm install -g pm2
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Stop existing PM2 process
pm2 stop cloudflare-telegram-bot 2>/dev/null || true

# Start the bot with PM2
echo -e "${GREEN}🤖 Starting bot with PM2...${NC}"
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

echo ""
echo -e "${GREEN}✅ Bot started successfully!${NC}"
echo ""
echo "📊 PM2 Status:"
pm2 status cloudflare-telegram-bot
echo ""
echo "📋 Useful commands:"
echo "  • Check logs: pm2 logs cloudflare-telegram-bot"
echo "  • Monitor: pm2 monit"
echo "  • Stop: pm2 stop cloudflare-telegram-bot"
echo "  • Restart: pm2 restart cloudflare-telegram-bot"
echo "  • Status: pm2 status"
echo ""
echo -e "${GREEN}🎉 Bot is now running!${NC}"
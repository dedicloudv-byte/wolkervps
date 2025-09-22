#!/bin/bash

# Cloudflare Telegram Bot Installation Script
# For Ubuntu 20.04 VPS

set -e

echo "🚀 Starting Cloudflare Telegram Bot installation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root"
   exit 1
fi

# Update system
print_status "Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 18.x
print_status "Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2 globally
print_status "Installing PM2..."
npm install -g pm2

# Install Git
print_status "Installing Git..."
apt install -y git

# Install build tools for native modules
print_status "Installing build tools..."
apt install -y build-essential python3

# Create bot directory
print_status "Creating bot directory..."
mkdir -p /opt/cloudflare-bot
cd /opt/cloudflare-bot

# Copy files to bot directory
print_status "Copying bot files..."
cp -r "$OLDPWD"/* /opt/cloudflare-bot/

# Install dependencies
print_status "Installing Node.js dependencies..."
npm install

# Create logs directory
print_status "Creating logs directory..."
mkdir -p logs

# Create data directory
print_status "Creating data directory..."
mkdir -p data

# Set permissions
print_status "Setting permissions..."
chmod 755 -R /opt/cloudflare-bot
chmod 644 package.json
chmod 644 ecosystem.config.js
chmod +x start-bot.sh

# Create systemd service
print_status "Creating systemd service..."
cat > /etc/systemd/system/cloudflare-bot.service << EOF
[Unit]
Description=Cloudflare Telegram Bot
After=network.target

[Service]
Type=forking
User=root
WorkingDirectory=/opt/cloudflare-bot
ExecStart=/usr/bin/pm2 start ecosystem.config.js
ExecReload=/usr/bin/pm2 reload ecosystem.config.js
ExecStop=/usr/bin/pm2 stop ecosystem.config.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create environment file template
print_status "Creating environment file template..."
cp .env.example .env

# Create startup script
print_status "Creating startup script..."
cat > start-bot.sh << 'EOF'
#!/bin/bash
cd /opt/cloudflare-bot

# Check if .env file exists and is configured
if [ ! -f .env ] || grep -q "YOUR_" .env; then
    echo "❌ Please configure the .env file first!"
    echo "Copy .env.example to .env and fill in your values:"
    echo "  TELEGRAM_BOT_TOKEN=your_bot_token"
    echo "  CLOUDFLARE_ACCOUNT_ID=your_account_id"
    echo "  CLOUDFLARE_API_TOKEN=your_api_token"
    exit 1
fi

# Start the bot with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "✅ Bot started successfully!"
echo "Check logs with: pm2 logs cloudflare-telegram-bot"
EOF

chmod +x start-bot.sh

# Enable and start service
print_status "Enabling systemd service..."
systemctl daemon-reload
systemctl enable cloudflare-bot

print_status "Installation completed! 🎉"
echo ""
echo "📋 Next steps:"
echo "1. Edit the .env file: nano /opt/cloudflare-bot/.env"
echo "2. Add your Telegram bot token and Cloudflare credentials"
echo "3. Start the bot: ./start-bot.sh"
echo "4. Check logs: pm2 logs cloudflare-telegram-bot"
echo ""
echo "📁 Bot directory: /opt/cloudflare-bot"
echo "📊 PM2 status: pm2 status"
echo "🔄 Update: npm update && pm2 restart cloudflare-telegram-bot"
echo "💾 Backup: tar -czf backup.tar.gz --exclude=node_modules --exclude=logs ."
echo ""
print_status "Installation finished successfully!"
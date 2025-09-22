# Cloudflare Telegram Bot Deployer - Deployment Guide

## 🚀 Quick Start

### 1. Download Package
Download the complete bot package and extract to your VPS.

### 2. Run Installation
```bash
cd cloudflare-telegram-bot
sudo chmod +x scripts/install.sh
sudo ./scripts/install.sh
```

### 3. Configure Bot
```bash
cd /opt/cloudflare-bot
cp .env.example .env
nano .env
```

Add your credentials:
```
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
BOT_OWNER_ID=your_telegram_id
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
```

### 4. Start Bot
```bash
./start-bot.sh
```

## 📋 Prerequisites

- VPS with Ubuntu 20.04+
- Root access
- Internet connection
- Telegram Bot Token
- Cloudflare Account with API access

## 🔧 Manual Installation (Alternative)

If automatic installation fails, use manual steps:

### Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Install PM2
```bash
sudo npm install -g pm2
```

### Setup Bot
```bash
npm install
cp .env.example .env
# Edit .env with your credentials
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🎯 Bot Usage Instructions

### For Bot Users:

1. **Start Bot**: Send `/start` to your bot
2. **Agree to Rules**: Click "SAYA SETUJU"
3. **Login Cloudflare**: 
   - Enter your Cloudflare API token
   - Enter your Cloudflare Account ID
4. **Use Features**:
   - **Deploy Nautika**: Deploy proxy script
   - **List Workers**: View all your workers
   - **Delete Worker**: Remove unwanted workers
   - **Deploy GitHub**: Deploy from GitHub repo

### For Bot Admin:

- Monitor logs: `pm2 logs cloudflare-telegram-bot`
- Check status: `pm2 status`
- Update bot: `./update-bot.sh`
- Backup data: `./backup-bot.sh`

## 🔒 Security Features

- API tokens are securely stored
- Input validation on all user inputs
- Session management
- Error handling
- Rate limiting (built into Telegram)

## 📊 Monitoring

### Health Check
Visit: `http://your-vps-ip:3000/health`

### PM2 Monitoring
```bash
pm2 monit
pm2 logs
pm2 status
```

## 🔄 Maintenance

### Regular Updates
```bash
./update-bot.sh
```

### Backup Data
```bash
./backup-bot.sh
```

### View Logs
```bash
pm2 logs cloudflare-telegram-bot --lines 50
```

## 🛠️ Troubleshooting

### Bot Not Responding
1. Check PM2 status: `pm2 status`
2. Check logs: `pm2 logs cloudflare-telegram-bot`
3. Restart: `pm2 restart cloudflare-telegram-bot`

### Cloudflare Authentication Failed
1. Verify API token has Workers edit permissions
2. Check Account ID is correct
3. Ensure token is not expired

### Deployment Failed
1. Check worker name is valid (lowercase, numbers, hyphens only)
2. Ensure worker name is unique
3. Check Cloudflare Workers quota
4. Verify script content is valid

## 📞 Support

For issues and questions:
1. Check logs first
2. Review error messages
3. Ensure all credentials are correct
4. Verify VPS connectivity

## 🎉 Success Indicators

✅ Bot responds to `/start` command  
✅ User can complete authentication  
✅ Nautika deployment works  
✅ Worker listing shows results  
✅ Worker deletion functions properly  
✅ GitHub deployment works  
✅ All navigation buttons work  
✅ Error messages are helpful  

Your bot is ready to use! 🚀
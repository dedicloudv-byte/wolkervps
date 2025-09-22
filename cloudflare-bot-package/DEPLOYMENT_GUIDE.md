# Cloudflare Telegram Bot - Deployment Guide

## 🚀 Quick Start (5 Minutes)

### 1. Upload Package to VPS
```bash
# Upload the cloudflare-bot-package to your VPS
# Extract the package
tar -xzf cloudflare-bot-package.tar.gz
cd cloudflare-bot-package
```

### 2. Run Automatic Installation
```bash
sudo chmod +x install.sh
sudo ./install.sh
```

### 3. Configure Environment
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

## 📋 Prerequisites Checklist

- [ ] VPS with Ubuntu 20.04 or newer
- [ ] Root access to VPS
- [ ] Internet connection
- [ ] Telegram Bot Token (from @BotFather)
- [ ] Cloudflare Account with API access
- [ ] Cloudflare Account ID
- [ ] Cloudflare API Token

## 🔑 Getting Required Credentials

### Telegram Bot Token
1. Open Telegram
2. Search for @BotFather
3. Send `/newbot`
4. Follow instructions to create bot
5. Copy the token provided

### Cloudflare Account ID
1. Login to dash.cloudflare.com
2. Look at the right sidebar for Account ID
3. Or click Cloudflare logo (top left)
4. Copy the Account ID

### Cloudflare API Token
1. Go to dash.cloudflare.com
2. Click profile icon (top right)
3. Select "My Profile"
4. Go to "API Tokens" tab
5. Click "Create Token"
6. Use "Edit Cloudflare Workers" template
7. Copy the generated token

## 🛠️ Manual Installation (If Auto Install Fails)

### Step 1: Install Node.js 18.x
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 2: Install PM2 Process Manager
```bash
sudo npm install -g pm2
```

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Configure Environment
```bash
cp .env.example .env
nano .env
```

### Step 5: Start with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🎯 Bot Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Your bot token from BotFather | `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11` |
| `BOT_OWNER_ID` | Your Telegram user ID | `123456789` |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | `abc123def456ghi789` |
| `CLOUDFLARE_API_TOKEN` | Your Cloudflare API token | `your-api-token-here` |
| `PORT` | Server port (default: 3000) | `3000` |
| `MAX_WORKERS_PER_USER` | Max workers per user (default: 10) | `10` |

### Getting Telegram User ID
1. Message @userinfobot on Telegram
2. It will return your user ID
3. Use this for BOT_OWNER_ID

## 🔧 Post-Installation Setup

### 1. Verify Installation
```bash
# Check if bot is running
pm2 status

# Check logs
pm2 logs cloudflare-telegram-bot

# Test health endpoint
curl http://localhost:3000/health
```

### 2. Set Up Firewall (Optional)
```bash
# Allow HTTP traffic
sudo ufw allow 3000/tcp

# If using reverse proxy (nginx/apache)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### 3. Set Up Reverse Proxy (Optional)
If you want to use domain name:
```nginx
# /etc/nginx/sites-available/cloudflare-bot
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🚀 Starting Your Bot

### Method 1: Using Start Script
```bash
cd /opt/cloudflare-bot
./start-bot.sh
```

### Method 2: Using PM2 Directly
```bash
pm2 start ecosystem.config.js
pm2 save
```

### Method 3: Using Systemd
```bash
sudo systemctl start cloudflare-bot
sudo systemctl enable cloudflare-bot
```

## 📊 Monitoring Your Bot

### Check Bot Status
```bash
pm2 status cloudflare-telegram-bot
```

### View Logs
```bash
# Real-time logs
pm2 logs cloudflare-telegram-bot

# Last 50 lines
pm2 logs cloudflare-telegram-bot --lines 50

# Error logs only
pm2 logs cloudflare-telegram-bot --err
```

### Monitor Performance
```bash
pm2 monit
```

### Health Check
Visit: `http://your-vps-ip:3000/health`

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-09-21T08:30:00.000Z",
  "uptime": 123.456
}
```

## 🔧 Maintenance

### Regular Updates
```bash
# Update dependencies
npm update

# Restart bot
pm2 restart cloudflare-telegram-bot
```

### Backup Data
```bash
# Backup everything
tar -czf backup-$(date +%Y%m%d).tar.gz --exclude=node_modules --exclude=logs .

# Backup database only
cp data/users.db backup-users-$(date +%Y%m%d).db
```

### Log Management
```bash
# Clear old logs
pm2 flush

# Rotate logs
pm2 reloadLogs
```

## 🚨 Troubleshooting Guide

### Bot Not Responding
1. **Check Status**: `pm2 status`
2. **Check Logs**: `pm2 logs cloudflare-telegram-bot --lines 20`
3. **Restart**: `pm2 restart cloudflare-telegram-bot`
4. **Check Token**: Verify TELEGRAM_BOT_TOKEN is correct

### Cloudflare Authentication Failed
1. **Verify Token**: Ensure API token has Workers edit permissions
2. **Check Account ID**: Verify Account ID is correct
3. **Token Validity**: Check if token is not expired
4. **Permissions**: Token must have Edit Cloudflare Workers permission

### Deployment Failed
1. **Worker Name**: Must be unique and valid format (lowercase, numbers, hyphens only)
2. **Quota Check**: Ensure you haven't reached Workers limit
3. **Script Validation**: Check if script content is valid JavaScript
4. **Network Issues**: Check VPS internet connectivity

### Database Issues
1. **Permissions**: Ensure data directory has write permissions
2. **Disk Space**: Check available disk space
3. **Corruption**: If corrupted, restore from backup

### Memory Issues
1. **Monitor Memory**: `pm2 monit`
2. **Restart Bot**: `pm2 restart cloudflare-telegram-bot`
3. **Check Logs**: Look for memory-related errors

## 📞 Getting Help

### Before Asking for Help:
1. Check logs: `pm2 logs cloudflare-telegram-bot --lines 50`
2. Verify all credentials are correct
3. Ensure VPS has internet connectivity
4. Check Cloudflare API status

### Information to Provide:
- Error messages from logs
- Steps to reproduce the issue
- Your environment (OS, Node.js version)
- Recent changes made

## 🎉 Success Verification

### Bot is Working if:
✅ Responds to `/start` command  
✅ Shows welcome message with rules  
✅ Accepts Cloudflare authentication  
✅ Displays main menu after login  
✅ Deploy Nautika works  
✅ List Workers shows results  
✅ Delete Worker functions properly  
✅ Deploy from GitHub works  
✅ All navigation buttons work  
✅ Error messages are helpful  

## 🎯 Next Steps

1. **Test All Features**: Try each feature to ensure everything works
2. **Monitor Performance**: Keep an eye on logs and performance
3. **Set Up Monitoring**: Consider setting up alerts for downtime
4. **Regular Maintenance**: Schedule regular updates and backups
5. **User Management**: Add more admins if needed

Your bot is now ready to serve users! 🎉

**Happy Deploying!** 🚀
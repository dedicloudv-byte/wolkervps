#!/bin/bash

# Cloudflare Telegram Bot Backup Script

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="/opt/backups/cloudflare-bot"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="backup_$DATE"

echo -e "${GREEN}📦 Creating backup...${NC}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create backup archive
echo -e "${YELLOW}📁 Archiving bot files...${NC}"
cd "$DIR/.."
tar -czf "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" \
    --exclude=node_modules \
    --exclude=logs \
    --exclude=.git \
    --exclude=data/*.db \
    --exclude="*.log" \
    cloudflare-telegram-bot

# Create database backup separately
if [ -f "$DIR/data/users.db" ]; then
    echo -e "${YELLOW}💾 Backing up database...${NC}"
    cp "$DIR/data/users.db" "$BACKUP_DIR/${BACKUP_NAME}_database.db"
fi

# Create backup info file
cat > "$BACKUP_DIR/${BACKUP_NAME}_info.txt" << EOF
Cloudflare Telegram Bot Backup
==============================
Date: $(date)
Backup Name: ${BACKUP_NAME}
Directory: $DIR

Files Included:
- Source code
- Configuration files
- Scripts
- Documentation

Files Excluded:
- node_modules
- Log files
- Git repository
- Runtime databases

Restore Instructions:
1. Extract the backup: tar -xzf ${BACKUP_NAME}.tar.gz
2. Install dependencies: npm install
3. Configure environment: cp .env.example .env && nano .env
4. Start the bot: ./start-bot.sh
EOF

echo ""
echo -e "${GREEN}✅ Backup created successfully!${NC}"
echo ""
echo "📁 Backup location: $BACKUP_DIR"
echo "📦 Archive: ${BACKUP_NAME}.tar.gz"
echo "💾 Database: ${BACKUP_NAME}_database.db (if exists)"
echo "📋 Info: ${BACKUP_NAME}_info.txt"
echo ""
echo "Total backup size: $(du -h "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" | cut -f1)"

# Cleanup old backups (keep last 10)
echo -e "${YELLOW}🧹 Cleaning up old backups...${NC}"
cd "$BACKUP_DIR"
ls -t *.tar.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
ls -t *_database.db 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true

echo -e "${GREEN}🎉 Backup process completed!${NC}"
module.exports = {
  // Telegram Bot Token - Ganti dengan token bot Anda
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN',
  
  // Cloudflare API Configuration
  cloudflare: {
    apiUrl: 'https://api.cloudflare.com/client/v4',
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
    apiToken: process.env.CLOUDFLARE_API_TOKEN || ''
  },
  
  // Bot Configuration
  bot: {
    ownerId: process.env.BOT_OWNER_ID || 'YOUR_TELEGRAM_ID',
    adminIds: (process.env.BOT_ADMIN_IDS || '').split(',').filter(id => id.trim()),
    maxWorkersPerUser: parseInt(process.env.MAX_WORKERS_PER_USER) || 10
  },
  
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || '0.0.0.0'
  },
  
  // Database Configuration (SQLite untuk simpan data user)
  database: {
    filename: process.env.DB_FILENAME || './data/users.db'
  }
};
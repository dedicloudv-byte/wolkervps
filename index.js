#!/usr/bin/env node

const Server = require('./src/server');
const config = require('./config/config');

// Environment validation
function validateEnvironment() {
  const requiredEnvVars = ['TELEGRAM_BOT_TOKEN'];
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar] && !config[envVar.toLowerCase()]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(envVar => console.error(`   - ${envVar}`));
    console.error('\nPlease set the required environment variables and try again.');
    process.exit(1);
  }
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Main function
async function main() {
  console.log(`
🤖 Cloudflare Telegram Bot Deployer
====================================
Version: 1.0.0
Node.js: ${process.version}
Platform: ${process.platform}
====================================
  `);

  // Validate environment
  validateEnvironment();

  // Create and start server
  const server = new Server();
  server.start();
}

// Start the application
main().catch(error => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});
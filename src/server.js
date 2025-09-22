const express = require('express');
const TelegramBotHandler = require('./telegram-bot');
const config = require('../config/config');

class Server {
  constructor() {
    this.app = express();
    this.telegramBot = new TelegramBotHandler();
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // CORS middleware
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // Webhook endpoint for Telegram
    this.app.post(`/webhook/${config.telegramToken}`, (req, res) => {
      res.sendStatus(200);
    });

    // API endpoints
    this.app.get('/api/status', (req, res) => {
      res.json({
        bot: 'running',
        timestamp: new Date().toISOString()
      });
    });

    // Error handling middleware
    this.app.use((err, req, res, next) => {
      console.error('Server error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: err.message
      });
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not found',
        path: req.path
      });
    });
  }

  start() {
    const port = config.server.port;
    const host = config.server.host;

    this.server = this.app.listen(port, host, () => {
      console.log(`🚀 Server running on http://${host}:${port}`);
      console.log(`📊 Health check: http://${host}:${port}/health`);
      
      // Start Telegram bot
      this.telegramBot.start();
    });

    // Graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  shutdown() {
    console.log('🔄 Shutting down server...');
    
    if (this.telegramBot) {
      this.telegramBot.stop();
    }

    if (this.server) {
      this.server.close(() => {
        console.log('✅ Server shut down successfully');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  }
}

module.exports = Server;
#!/usr/bin/env node

const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN',
  cloudflare: {
    apiUrl: 'https://api.cloudflare.com/client/v4',
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
    apiToken: process.env.CLOUDFLARE_API_TOKEN || ''
  },
  bot: {
    ownerId: process.env.BOT_OWNER_ID || 'YOUR_TELEGRAM_ID',
    maxWorkersPerUser: parseInt(process.env.MAX_WORKERS_PER_USER) || 10
  },
  server: {
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || '0.0.0.0'
  },
  database: {
    filename: process.env.DB_FILENAME || './data/users.db'
  }
};

// Database setup
class Database {
  constructor() {
    const dataDir = path.dirname(config.database.filename);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.db = new sqlite3.Database(config.database.filename);
    this.initTables();
  }

  initTables() {
    const queries = [
      `CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        cloudflare_token TEXT,
        cloudflare_account_id TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS workers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        worker_name TEXT NOT NULL,
        worker_url TEXT,
        subdomain TEXT,
        script_content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      )`,
      `CREATE TABLE IF NOT EXISTS sessions (
        user_id INTEGER PRIMARY KEY,
        session_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    this.db.serialize(() => {
      queries.forEach(query => this.db.run(query));
    });
  }

  getUser(userId) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM users WHERE user_id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  createUser(userData) {
    const { user_id, username, first_name, last_name } = userData;
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO users (user_id, username, first_name, last_name, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      stmt.run([user_id, username, first_name, last_name], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
      stmt.finalize();
    });
  }

  updateUserCloudflare(userId, token, accountId) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        UPDATE users 
        SET cloudflare_token = ?, cloudflare_account_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `);
      stmt.run([token, accountId, userId], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
      stmt.finalize();
    });
  }

  getUserWorkers(userId) {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM workers WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  createWorker(userId, workerData) {
    const { worker_name, worker_url, subdomain, script_content } = workerData;
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO workers (user_id, worker_name, worker_url, subdomain, script_content)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run([userId, worker_name, worker_url, subdomain, script_content], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
      stmt.finalize();
    });
  }

  deleteWorkerByName(userId, workerName) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM workers WHERE user_id = ? AND worker_name = ?', [userId, workerName], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  getSession(userId) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM sessions WHERE user_id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row ? JSON.parse(row.session_data) : null);
      });
    });
  }

  setSession(userId, sessionData) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO sessions (user_id, session_data, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `);
      stmt.run([userId, JSON.stringify(sessionData)], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
      stmt.finalize();
    });
  }

  clearSession(userId) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM sessions WHERE user_id = ?', [userId], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }
}

// Cloudflare API
class CloudflareAPI {
  constructor(apiToken, accountId) {
    this.apiToken = apiToken;
    this.accountId = accountId;
    this.baseURL = config.cloudflare.apiUrl;
    
    this.axios = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async validateToken() {
    try {
      const response = await this.axios.get('/user/tokens/verify');
      if (response.data.success) {
        const accountResponse = await this.axios.get('/accounts');
        if (accountResponse.data.success && accountResponse.data.result.length > 0) {
          return {
            success: true,
            account: accountResponse.data.result[0],
            tokenInfo: response.data.result
          };
        }
      }
      return { success: false, error: 'Invalid token or no accounts found' };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.errors?.[0]?.message || error.message 
      };
    }
  }

  async listWorkers() {
    try {
      const response = await this.axios.get(`/accounts/${this.accountId}/workers/scripts`);
      if (response.data.success) {
        return { success: true, workers: response.data.result };
      }
      return { success: false, error: 'Failed to list workers' };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.errors?.[0]?.message || error.message 
      };
    }
  }

  async getWorker(scriptName) {
    try {
      const response = await this.axios.get(`/accounts/${this.accountId}/workers/scripts/${scriptName}`);
      if (response.data.success) {
        return { success: true, worker: response.data.result };
      }
      return { success: false, error: 'Worker not found' };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.errors?.[0]?.message || error.message 
      };
    }
  }

  async deployWorker(scriptName, scriptContent) {
    try {
      const metadata = {
        body_part: 'script',
        bindings: []
      };

      const boundary = '----WorkerBoundary' + Date.now();
      const body = this.createMultipartBody(boundary, scriptContent, JSON.stringify(metadata));

      const response = await this.axios.put(
        `/accounts/${this.accountId}/workers/scripts/${scriptName}`,
        body,
        {
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`
          }
        }
      );

      if (response.data.success) {
        return { 
          success: true, 
          worker: response.data.result,
          url: `https://${scriptName}.${this.accountId}.workers.dev`
        };
      }
      return { success: false, error: 'Failed to deploy worker' };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.errors?.[0]?.message || error.message 
      };
    }
  }

  async deleteWorker(scriptName) {
    try {
      const response = await this.axios.delete(`/accounts/${this.accountId}/workers/scripts/${scriptName}`);
      if (response.data.success) {
        return { success: true };
      }
      return { success: false, error: 'Failed to delete worker' };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.errors?.[0]?.message || error.message 
      };
    }
  }

  createMultipartBody(boundary, scriptContent, metadata) {
    const lines = [];
    lines.push(`--${boundary}`);
    lines.push(`Content-Disposition: form-data; name="metadata"`);
    lines.push(`Content-Type: application/json`);
    lines.push('');
    lines.push(metadata);
    lines.push(`--${boundary}`);
    lines.push(`Content-Disposition: form-data; name="script"`);
    lines.push(`Content-Type: application/javascript`);
    lines.push('');
    lines.push(scriptContent);
    lines.push(`--${boundary}--`);
    return lines.join('\r\n');
  }
}

// Nautika Script
function getNautikaScript() {
  return `// Nautika Worker Script
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url);
  
  if (url.pathname === '/health') {
    return new Response('OK', { status: 200 });
  }
  
  if (url.pathname === '/info') {
    const info = {
      worker: 'Nautika Proxy',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };
    return new Response(JSON.stringify(info, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response('Nautika Worker is running!', {
    headers: { 'Content-Type': 'text/plain' }
  });
}`;
}

// Telegram Bot Handler
class TelegramBotHandler {
  constructor() {
    this.bot = new TelegramBot(config.telegramToken, { polling: true });
    this.db = new Database();
    this.setupHandlers();
  }

  setupHandlers() {
    // Start command
    this.bot.onText(/\/start/, (msg) => this.handleStart(msg));
    this.bot.onText(/\/help/, (msg) => this.handleHelp(msg));
    this.bot.onText(/\/cancel/, (msg) => this.handleCancel(msg));

    // Callback queries
    this.bot.on('callback_query', (callbackQuery) => this.handleCallbackQuery(callbackQuery));

    // Messages
    this.bot.on('message', (msg) => this.handleMessage(msg));
  }

  async handleStart(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    await this.db.createUser({
      user_id: userId,
      username: msg.from.username,
      first_name: msg.from.first_name,
      last_name: msg.from.last_name
    });

    const welcomeText = `
🤖 *Selamat datang di Cloudflare Workers Deployer Bot!*

Bot ini membantu Anda untuk:
• Deploy script ke Cloudflare Workers
• Mengelola workers Anda
• Deploy dari GitHub repository

⚠️ *PERINGATAN & PERATURAN:*
• Gunakan bot ini dengan bijak
• Jangan spam atau abuse fitur
• Token API Anda disimpan secara aman
• Bot ini hanya untuk keperluan legitimate
• Penyalahgunaan dapat mengakibatkan banned

💡 *CARA PENGGUNAAN:*
1. Klik "SAYA SETUJU" di bawah
2. Masukkan token API Cloudflare Anda
3. Masukkan Account ID Cloudflare Anda
4. Mulai deploy workers Anda

🔒 *KEAMANAN:*
• Token Anda aman dan terenkripsi
• Tidak akan dibagikan ke pihak ketiga

*Apakah Anda setuju dengan peraturan di atas?*
    `;

    const options = {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ SAYA SETUJU', callback_data: `agree_${userId}` },
          { text: '❌ TIDAK SETUJU', callback_data: `disagree_${userId}` }
        ]]
      }
    };

    await this.bot.sendMessage(chatId, welcomeText, options);
  }

  async handleHelp(msg) {
    const chatId = msg.chat.id;
    
    const helpText = `
🤖 *Cloudflare Telegram Bot - Bantuan*

*PERINTAH UTAMA:*
• /start - Mulai menggunakan bot
• /help - Tampilkan bantuan ini
• /cancel - Batalkan operasi saat ini

*FITUR BOT:*
1️⃣ *Deploy Nautika* - Deploy script Nautika
2️⃣ *List Workers* - Lihat semua workers Anda
3️⃣ *Hapus Worker* - Hapus worker tertentu
4️⃣ *Deploy dari GitHub* - Deploy dari repository GitHub

*CARA PENGGUNAAN:*
1. Klik /start dan setujui peraturan
2. Masukkan token API Cloudflare
3. Masukkan Account ID Cloudflare
4. Pilih fitur yang diinginkan
    `;

    await this.bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
  }

  async handleCancel(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    await this.db.clearSession(userId);
    
    await this.bot.sendMessage(chatId, '❌ Operasi dibatalkan.', {
      reply_markup: {
        inline_keyboard: [[
          { text: '🏠 Menu Utama', callback_data: `main_menu_${userId}` }
        ]]
      }
    });
  }

  async handleCallbackQuery(callbackQuery) {
    const data = callbackQuery.data;
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message.chat.id;

    try {
      await this.bot.answerCallbackQuery(callbackQuery.id);
      
      if (data.startsWith('agree_')) {
        await this.handleAgreement(chatId, userId);
      } else if (data.startsWith('main_menu_')) {
        await this.showMainMenu(chatId, userId);
      } else if (data.startsWith('deploy_nautika_')) {
        await this.handleDeployNautika(chatId, userId);
      } else if (data.startsWith('list_workers_')) {
        await this.handleListWorkers(chatId, userId);
      } else if (data.startsWith('delete_worker_')) {
        await this.handleDeleteWorker(chatId, userId);
      } else if (data.startsWith('deploy_github_')) {
        await this.handleDeployGitHub(chatId, userId);
      } else if (data.startsWith('confirm_delete_')) {
        const workerName = data.split('_')[3];
        await this.confirmDeleteWorker(chatId, userId, workerName, callbackQuery.message.message_id);
      } else if (data.startsWith('delete_confirmed_')) {
        const workerName = data.split('_')[3];
        await this.executeDeleteWorker(chatId, userId, workerName);
      } else if (data.startsWith('cancel_delete_')) {
        await this.showMainMenu(chatId, userId, callbackQuery.message.message_id);
      }
    } catch (error) {
      console.error('Callback query error:', error);
      await this.bot.sendMessage(chatId, '❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  async handleAgreement(chatId, userId) {
    await this.db.setSession(userId, { state: 'waiting_token' });

    const text = `
✅ *Anda telah menyetujui peraturan!*

Selanjutnya, silakan masukkan *Token API Cloudflare* Anda.

*Cara mendapatkan Token API:*
1. Buka dash.cloudflare.com
2. Klik ikon profil (kanan atas)
3. Pilih "My Profile"
4. Klik tab "API Tokens"
5. Klik "Create Token"
6. Gunakan template "Edit Cloudflare Workers"
7. Copy token yang dihasilspkan

*Masukkan token Anda sekarang:*
    `;

    await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  }

  async showMainMenu(chatId, userId) {
    await this.db.clearSession(userId);

    const user = await this.db.getUser(userId);
    const isAuthenticated = user && user.cloudflare_token;

    const text = `
🏠 *Menu Utama*

${isAuthenticated ? '✅ *Terautentikasi*' : '❌ *Belum Terautentikasi*'}

Silakan pilih fitur yang diinginkan:
    `;

    const keyboard = [
      [{ text: '🚀 Deploy Nautika', callback_data: `deploy_nautika_${userId}` }],
      [{ text: '📋 List Workers', callback_data: `list_workers_${userId}` }],
      [{ text: '🗑️ Hapus Worker', callback_data: `delete_worker_${userId}` }],
      [{ text: '🔧 Deploy dari GitHub', callback_data: `deploy_github_${userId}` }]
    ];

    await this.bot.sendMessage(chatId, text, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  async handleDeployNautika(chatId, userId) {
    const user = await this.db.getUser(userId);
    if (!user || !user.cloudflare_token) {
      await this.bot.sendMessage(chatId, '❌ Anda harus login terlebih dahulu. Klik /start untuk memulai.');
      return;
    }

    await this.db.setSession(userId, { state: 'deploy_nautika_name' });

    await this.bot.sendMessage(chatId, `
🚀 *Deploy Nautika*

Silakan masukkan *nama worker* yang ingin Anda buat:

*Contoh:* \`nautika-proxy\` atau \`my-proxy-worker\`

*Nama worker harus:*
• Unik (belum digunakan)
• Hanya huruf kecil, angka, dan tanda hubung
• Maksimal 63 karakter
    `, { parse_mode: 'Markdown' });
  }

  async handleListWorkers(chatId, userId) {
    const user = await this.db.getUser(userId);
    if (!user || !user.cloudflare_token) {
      await this.bot.sendMessage(chatId, '❌ Anda harus login terlebih dahulu.');
      return;
    }

    await this.bot.sendMessage(chatId, '📋 *Sedang mengambil daftar workers...*', { parse_mode: 'Markdown' });

    try {
      const cf = new CloudflareAPI(user.cloudflare_token, user.cloudflare_account_id);
      const result = await cf.listWorkers();

      if (result.success && result.workers.length > 0) {
        let message = '📋 *Daftar Workers Anda:*\n\n';
        
        result.workers.forEach((worker, index) => {
          message += `${index + 1}. *${worker.id}*\n`;
          message += `   🕐 Dibuat: ${new Date(worker.created_on).toLocaleString('id-ID')}\n`;
          message += `   🔗 URL: https://${worker.id}.${user.cloudflare_account_id}.workers.dev\n\n`;
        });

        await this.bot.sendMessage(chatId, message, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '🏠 Menu Utama', callback_data: `main_menu_${userId}` }
            ]]
          }
        });
      } else {
        await this.bot.sendMessage(chatId, '📋 *Belum ada workers yang terdeploy.*', {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '🏠 Menu Utama', callback_data: `main_menu_${userId}` }
            ]]
          }
        });
      }
    } catch (error) {
      console.error('List workers error:', error);
      await this.bot.sendMessage(chatId, '❌ *Gagal mengambil daftar workers.*', { parse_mode: 'Markdown' });
    }
  }

  async handleDeleteWorker(chatId, userId) {
    const user = await this.db.getUser(userId);
    if (!user || !user.cloudflare_token) {
      await this.bot.sendMessage(chatId, '❌ Anda harus login terlebih dahulu.');
      return;
    }

    await this.bot.sendMessage(chatId, '🗑️ *Sedang mengambil daftar workers...*', { parse_mode: 'Markdown' });

    try {
      const cf = new CloudflareAPI(user.cloudflare_token, user.cloudflare_account_id);
      const result = await cf.listWorkers();

      if (result.success && result.workers.length > 0) {
        let message = '🗑️ *Pilih worker yang ingin dihapus:*\n\n';
        
        const keyboard = [];
        result.workers.forEach((worker, index) => {
          message += `${index + 1}. *${worker.id}*\n`;
          keyboard.push([{
            text: `🗑️ ${worker.id}`,
            callback_data: `confirm_delete_${userId}_${worker.id}`
          }]);
        });

        keyboard.push([{ text: '🏠 Menu Utama', callback_data: `main_menu_${userId}` }]);

        await this.bot.sendMessage(chatId, message, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        });
      } else {
        await this.bot.sendMessage(chatId, '📋 *Tidak ada workers yang dapat dihapus.*', {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '🏠 Menu Utama', callback_data: `main_menu_${userId}` }
            ]]
          }
        });
      }
    } catch (error) {
      console.error('Delete worker error:', error);
      await this.bot.sendMessage(chatId, '❌ *Gagal mengambil daftar workers.*', { parse_mode: 'Markdown' });
    }
  }

  async confirmDeleteWorker(chatId, userId, workerName, messageId) {
    await this.bot.editMessageText(`
🗑️ *Konfirmasi Hapus Worker*

Apakah Anda yakin ingin menghapus worker:
*${workerName}*

⚠️ *Peringatan:* 
• Worker akan dihapus permanen
• Tidak dapat dikembalikan
• URL worker akan tidak aktif

    `, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Ya, Hapus', callback_data: `delete_confirmed_${userId}_${workerName}` },
            { text: '❌ Batal', callback_data: `cancel_delete_${userId}` }
          ]
        ]
      }
    });
  }

  async executeDeleteWorker(chatId, userId, workerName) {
    const user = await this.db.getUser(userId);
    if (!user || !user.cloudflare_token) {
      await this.bot.sendMessage(chatId, '❌ Anda harus login terlebih dahulu.');
      return;
    }

    try {
      const cf = new CloudflareAPI(user.cloudflare_token, user.cloudflare_account_id);
      const result = await cf.deleteWorker(workerName);

      if (result.success) {
        await this.db.deleteWorkerByName(userId, workerName);
        
        await this.bot.sendMessage(chatId, `
✅ *Worker berhasil dihapus!*

*Nama:* ${workerName}
*Status:* Terhapus

Worker Anda telah berhasil dihapus dari Cloudflare.
        `, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '🏠 Menu Utama', callback_data: `main_menu_${userId}` }
            ]]
          }
        });
      } else {
        await this.bot.sendMessage(chatId, `❌ *Gagal menghapus worker.*\n\nError: ${result.error}`, { parse_mode: 'Markdown' });
      }
    } catch (error) {
      console.error('Delete worker execution error:', error);
      await this.bot.sendMessage(chatId, '❌ *Terjadi kesalahan saat menghapus worker.*', { parse_mode: 'Markdown' });
    }
  }

  async handleDeployGitHub(chatId, userId) {
    const user = await this.db.getUser(userId);
    if (!user || !user.cloudflare_token) {
      await this.bot.sendMessage(chatId, '❌ Anda harus login terlebih dahulu. Klik /start untuk memulai.');
      return;
    }

    await this.db.setSession(userId, { state: 'deploy_github_name' });

    await this.bot.sendMessage(chatId, `
🔧 *Deploy dari GitHub*

Silakan masukkan *nama worker* yang ingin Anda buat:

*Contoh:* \`github-worker\` atau \`my-repo-worker\`
    `, { parse_mode: 'Markdown' });
  }

  async handleMessage(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    if (!text || text.startsWith('/')) return;

    const session = await this.db.getSession(userId);
    if (!session || !session.state) return;

    try {
      switch (session.state) {
        case 'waiting_token':
          await this.handleTokenInput(chatId, userId, text);
          break;
        case 'waiting_account_id':
          await this.handleAccountIdInput(chatId, userId, text);
          break;
        case 'deploy_nautika_name':
          await this.handleNautikaNameInput(chatId, userId, text);
          break;
        case 'deploy_github_name':
          await this.handleGitHubNameInput(chatId, userId, text);
          break;
        case 'deploy_github_url':
          await this.handleGitHubUrlInput(chatId, userId, text);
          break;
      }
    } catch (error) {
      console.error('Message handler error:', error);
      await this.bot.sendMessage(chatId, '❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  async handleTokenInput(chatId, userId, token) {
    if (token.length < 20) {
      await this.bot.sendMessage(chatId, '❌ Token tidak valid. Token API Cloudflare biasanya lebih panjang.');
      return;
    }

    const session = await this.db.getSession(userId);
    session.tempToken = token;
    session.state = 'waiting_account_id';
    await this.db.setSession(userId, session);

    await this.bot.sendMessage(chatId, `
✅ *Token diterima!*

Sekarang masukkan *Account ID* Cloudflare Anda:

*Cara mendapatkan Account ID:*
1. Buka dash.cloudflare.com
2. Pilih domain/worker Anda
3. Account ID ada di sidebar kanan
4. Atau klik logo Cloudflare (kiri atas)
5. Copy Account ID yang terlihat

*Masukkan Account ID Anda sekarang:*
    `, { parse_mode: 'Markdown' });
  }

  async handleAccountIdInput(chatId, userId, accountId) {
    const session = await this.db.getSession(userId);
    const token = session.tempToken;

    const cf = new CloudflareAPI(token, accountId);
    const validation = await cf.validateToken();

    if (!validation.success) {
      await this.bot.sendMessage(chatId, `❌ *Validasi gagal!*\n\nError: ${validation.error}\n\nSilakan cek kembali token dan account ID Anda.`);
      return;
    }

    await this.db.updateUserCloudflare(userId, token, accountId);
    await this.db.clearSession(userId);

    const accountInfo = validation.account;
    await this.bot.sendMessage(chatId, `
✅ *Login berhasil!*

*Informasi Akun:*
• Nama: ${accountInfo.name || 'Tidak tersedia'}
• Email: ${validation.tokenInfo.status || 'Tidak tersedia'}
• Account ID: ${accountInfo.id}

Anda sekarang dapat menggunakan semua fitur bot!

Pilih menu di bawah ini:
    `, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '🏠 Menu Utama', callback_data: `main_menu_${userId}` }
        ]]
      }
    });
  }

  async handleNautikaNameInput(chatId, userId, workerName) {
    if (!/^[a-z0-9-]{1,63}$/.test(workerName)) {
      await this.bot.sendMessage(chatId, `
❌ *Nama worker tidak valid!*

*Nama worker harus:*
• Hanya huruf kecil, angka, dan tanda hubung
• Maksimal 63 karakter
• Tidak boleh kosung

*Contoh yang benar:* \`nautika-proxy\`, \`my-worker-123\`

Silakan coba lagi:
      `, { parse_mode: 'Markdown' });
      return;
    }

    const user = await this.db.getUser(userId);
    const cf = new CloudflareAPI(user.cloudflare_token, user.cloudflare_account_id);

    const existingWorker = await cf.getWorker(workerName);
    if (existingWorker.success) {
      await this.bot.sendMessage(chatId, `
❌ *Worker dengan nama "${workerName}" sudah ada!*

Silakan pilih nama yang lain:
      `, { parse_mode: 'Markdown' });
      return;
    }

    await this.bot.sendMessage(chatId, '🚀 *Sedang mendeploy Nautika...*', { parse_mode: 'Markdown' });

    try {
      const nautikaScript = getNautikaScript();
      const deployment = await cf.deployWorker(workerName, nautikaScript);

      if (deployment.success) {
        await this.db.createWorker(userId, {
          worker_name: workerName,
          worker_url: deployment.url,
          subdomain: workerName,
          script_content: nautikaScript
        });

        await this.bot.sendMessage(chatId, `
✅ *Deploy berhasil!*

*Detail Worker:*
• Nama: ${workerName}
• URL: ${deployment.url}
• Status: Aktif

Worker Anda sekarang dapat diakses di:
${deployment.url}
        `, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '🏠 Menu Utama', callback_data: `main_menu_${userId}` }
            ]]
          }
        });
      } else {
        await this.bot.sendMessage(chatId, `❌ *Deploy gagal!*\n\nError: ${deployment.error}`, { parse_mode: 'Markdown' });
      }
    } catch (error) {
      console.error('Deployment error:', error);
      await this.bot.sendMessage(chatId, '❌ *Terjadi kesalahan saat deploy.*\n\nSilakan coba lagi nanti.', { parse_mode: 'Markdown' });
    }

    await this.db.clearSession(userId);
  }

  async handleGitHubNameInput(chatId, userId, workerName) {
    if (!/^[a-z0-9-]{1,63}$/.test(workerName)) {
      await this.bot.sendMessage(chatId, `
❌ *Nama worker tidak valid!*

Silakan coba lagi dengan nama yang valid:
• Hanya huruf kecil, angka, dan tanda hubung
• Maksimal 63 karakter
      `, { parse_mode: 'Markdown' });
      return;
    }

    const session = await this.db.getSession(userId);
    session.workerName = workerName;
    session.state = 'deploy_github_url';
    await this.db.setSession(userId, session);

    await this.bot.sendMessage(chatId, `
✅ *Nama worker diterima: ${workerName}*

Sekarang masukkan *URL GitHub repository* Anda:

*Format yang benar:*
• https://github.com/username/repository
• https://github.com/username/repository.git

*Contoh:*
• https://github.com/cloudflare/worker-template
• https://github.com/myuser/my-worker-repo.git

*Masukkan URL GitHub sekarang:*
    `, { parse_mode: 'Markdown' });
  }

  async handleGitHubUrlInput(chatId, userId, githubUrl) {
    const session = await this.db.getSession(userId);
    const workerName = session.workerName;

    const githubRegex = /^https?:\/\/github\.com\/[\w-]+\/[\w-]+(\.git)?$/;
    if (!githubRegex.test(githubUrl)) {
      await this.bot.sendMessage(chatId, `
❌ *URL GitHub tidak valid!*

*Format yang benar:*
• https://github.com/username/repository
• https://github.com/username/repository.git

Silakan coba lagi:
      `, { parse_mode: 'Markdown' });
      return;
    }

    await this.bot.sendMessage(chatId, `🔧 *Sedang clone repository dan deploy...*`, { parse_mode: 'Markdown' });

    try {
      // Fetch script from GitHub
      let scriptContent = null;
      const repoPath = githubUrl.replace('https://github.com/', '').replace('.git', '');
      
      // Try main branch first
      try {
        const rawUrl = `https://raw.githubusercontent.com/${repoPath}/main/index.js`;
        const response = await axios.get(rawUrl);
        scriptContent = response.data;
      } catch (error) {
        // Try master branch
        const rawUrl = `https://raw.githubusercontent.com/${repoPath}/master/index.js`;
        const response = await axios.get(rawUrl);
        scriptContent = response.data;
      }

      if (!scriptContent) {
        await this.bot.sendMessage(chatId, '❌ *Gagal mengambil script dari repository.*', { parse_mode: 'Markdown' });
        return;
      }

      const user = await this.db.getUser(userId);
      const cf = new CloudflareAPI(user.cloudflare_token, user.cloudflare_account_id);
      
      const deployment = await cf.deployWorker(workerName, scriptContent);

      if (deployment.success) {
        await this.db.createWorker(userId, {
          worker_name: workerName,
          worker_url: deployment.url,
          subdomain: workerName,
          script_content: scriptContent
        });

        await this.bot.sendMessage(chatId, `
✅ *Deploy dari GitHub berhasil!*

*Detail Worker:*
• Nama: ${workerName}
• URL: ${deployment.url}
• Repository: ${githubUrl}
• Status: Aktif

Worker Anda sekarang dapat diakses di:
${deployment.url}
        `, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '🏠 Menu Utama', callback_data: `main_menu_${userId}` }
            ]]
          }
        });
      } else {
        await this.bot.sendMessage(chatId, `❌ *Deploy gagal!*\n\nError: ${deployment.error}`, { parse_mode: 'Markdown' });
      }
    } catch (error) {
      console.error('GitHub deployment error:', error);
      await this.bot.sendMessage(chatId, '❌ *Terjadi kesalahan saat deploy dari GitHub.*', { parse_mode: 'Markdown' });
    }

    await this.db.clearSession(userId);
  }

  start() {
    console.log('🤖 Telegram Bot started...');
  }

  stop() {
    this.bot.stopPolling();
    this.db.close();
    console.log('🤖 Telegram Bot stopped...');
  }
}

// Express Server
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
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    this.app.get('/api/status', (req, res) => {
      res.json({
        bot: 'running',
        timestamp: new Date().toISOString()
      });
    });

    this.app.use((err, req, res, next) => {
      console.error('Server error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: err.message
      });
    });

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
      this.telegramBot.start();
    });

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

// Main function
function main() {
  console.log(`
🤖 Cloudflare Telegram Bot Deployer
====================================
Version: 1.0.0
Node.js: ${process.version}
====================================
  `);

  if (!config.telegramToken || config.telegramToken === 'YOUR_TELEGRAM_BOT_TOKEN') {
    console.error('❌ Please set TELEGRAM_BOT_TOKEN in environment variables');
    process.exit(1);
  }

  const server = new Server();
  server.start();
}

main().catch(error => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});
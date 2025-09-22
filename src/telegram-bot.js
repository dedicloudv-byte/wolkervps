const TelegramBot = require('node-telegram-bot-api');
const config = require('../config/config');
const Database = require('./database');
const CloudflareAPI = require('./cloudflare');
const axios = require('axios');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class TelegramBotHandler {
  constructor() {
    this.bot = new TelegramBot(config.telegramToken, { polling: true });
    this.db = new Database();
    this.sessions = new Map();
    
    this.setupCommands();
    this.setupCallbacks();
    this.setupMessageHandler();
  }

  setupCommands() {
    // Start command
    this.bot.onText(/\/start/, async (msg) => {
      await this.handleStart(msg);
    });

    // Help command
    this.bot.onText(/\/help/, async (msg) => {
      await this.handleHelp(msg);
    });

    // Cancel command
    this.bot.onText(/\/cancel/, async (msg) => {
      await this.handleCancel(msg);
    });
  }

  setupCallbacks() {
    this.bot.on('callback_query', async (callbackQuery) => {
      await this.handleCallbackQuery(callbackQuery);
    });
  }

  setupMessageHandler() {
    this.bot.on('message', async (msg) => {
      await this.handleMessage(msg);
    });
  }

  async handleStart(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // Create user in database
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
• Token Anda dienkripsi dan aman
• Tidak akan dibagikan ke pihak ketiga
• Hanya digunakan untuk operasi bot

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
🤖 *Cloudflare Workers Deployer Bot - Bantuan*

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

*TIPS:*
• Token API didapatkan dari dash.cloudflare.com
• Account ID ada di dashboard Cloudflare Anda
• Gunakan nama worker yang unik

*KEAMANAN:*
• Token Anda aman dan terenkripsi
• Tidak akan dibagikan ke pihak ketiga
    `;

    await this.bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
  }

  async handleCancel(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // Clear session
    await this.db.clearSession(userId);
    
    await this.bot.sendMessage(chatId, '❌ Operasi dibatalkan. Silahkan pilih menu utama.', {
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
    const messageId = callbackQuery.message.message_id;

    try {
      await this.bot.answerCallbackQuery(callbackQuery.id);
      
      if (data.startsWith('agree_')) {
        await this.handleAgreement(chatId, userId, messageId, true);
      } else if (data.startsWith('disagree_')) {
        await this.handleAgreement(chatId, userId, messageId, false);
      } else if (data.startsWith('main_menu_')) {
        await this.showMainMenu(chatId, userId, messageId);
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
        await this.confirmDeleteWorker(chatId, userId, workerName, messageId);
      } else if (data.startsWith('delete_confirmed_')) {
        const workerName = data.split('_')[3];
        await this.executeDeleteWorker(chatId, userId, workerName);
      } else if (data.startsWith('cancel_delete_')) {
        await this.showMainMenu(chatId, userId, messageId);
      }
    } catch (error) {
      console.error('Callback query error:', error);
      await this.bot.sendMessage(chatId, '❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  }

  async handleAgreement(chatId, userId, messageId, agreed) {
    if (!agreed) {
      await this.bot.editMessageText(
        '❌ Anda harus menyetujui peraturan untuk menggunakan bot ini.',
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [[
              { text: '🔙 Kembali ke Start', callback_data: `start_${userId}` }
            ]]
          }
        }
      );
      return;
    }

    // Set session state
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
7. Copy token yang dihasilkan

*Masukkan token Anda sekarang:*
    `;

    await this.bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown'
    });
  }

  async showMainMenu(chatId, userId, messageId = null) {
    // Clear session
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

    if (!isAuthenticated) {
      keyboard.unshift([{ text: '🔐 Login Cloudflare', callback_data: `login_${userId}` }]);
    }

    const options = {
      chat_id: chatId,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    };

    if (messageId) {
      await this.bot.editMessageText(text, { ...options, message_id: messageId });
    } else {
      await this.bot.sendMessage(chatId, text, options);
    }
  }

  async handleDeployNautika(chatId, userId) {
    const user = await this.db.getUser(userId);
    if (!user || !user.cloudflare_token) {
      await this.bot.sendMessage(chatId, '❌ Anda harus login terlebih dahulu. Klik /start untuk memulai.');
      return;
    }

    // Set session state
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

  async handleMessage(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;

    // Skip commands
    if (text && text.startsWith('/')) return;

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
    // Validate token format (basic validation)
    if (token.length < 20) {
      await this.bot.sendMessage(chatId, '❌ Token tidak valid. Token API Cloudflare biasanya lebih panjang.');
      return;
    }

    // Update session
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

    // Validate token and account
    const cf = new CloudflareAPI(token, accountId);
    const validation = await cf.validateToken();

    if (!validation.success) {
      await this.bot.sendMessage(chatId, `❌ *Validasi gagal!*\n\nError: ${validation.error}\n\nSilakan cek kembali token dan account ID Anda.`);
      return;
    }

    // Save to database
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
    // Validate worker name
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

    // Check if worker already exists
    const existingWorker = await cf.getWorker(workerName);
    if (existingWorker.success) {
      await this.bot.sendMessage(chatId, `
❌ *Worker dengan nama "${workerName}" sudah ada!*

Silakan pilih nama yang lain:
      `, { parse_mode: 'Markdown' });
      return;
    }

    // Deploy Nautika script
    await this.bot.sendMessage(chatId, '🚀 *Sedang mendeploy Nautika...*', { parse_mode: 'Markdown' });

    try {
      // Get the Nautika script from the provided code
      const nautikaScript = this.getNautikaScript();
      
      const deployment = await cf.deployWorker(workerName, nautikaScript);
      
      if (deployment.success) {
        // Save to database
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

*Catatan:* Worker mungkin perlu beberapa detik untuk aktif sepenuhnya.
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
        await this.bot.sendMessage(chatId, `
📋 *Belum ada workers*

Anda belum memiliki workers yang terdeploy.

Silakan deploy worker terlebih dahulu:
• Deploy Nautika
• Deploy dari GitHub
        `, {
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
        // Also delete from database
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

    // Set session state
    await this.db.setSession(userId, { state: 'deploy_github_name' });

    await this.bot.sendMessage(chatId, `
🔧 *Deploy dari GitHub*

Silakan masukkan *nama worker* yang ingin Anda buat:

*Contoh:* \`github-worker\` atau \`my-repo-worker\`
    `, { parse_mode: 'Markdown' });
  }

  async handleGitHubNameInput(chatId, userId, workerName) {
    // Validate worker name
    if (!/^[a-z0-9-]{1,63}$/.test(workerName)) {
      await this.bot.sendMessage(chatId, `
❌ *Nama worker tidak valid!*

Silakan coba lagi dengan nama yang valid:
• Hanya huruf kecil, angka, dan tanda hubung
• Maksimal 63 karakter
      `, { parse_mode: 'Markdown' });
      return;
    }

    // Set session state
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

    // Validate GitHub URL
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
      // Clone repository and get script
      const scriptContent = await this.cloneAndGetScript(githubUrl);
      
      if (!scriptContent) {
        await this.bot.sendMessage(chatId, '❌ *Gagal mengambil script dari repository.*', { parse_mode: 'Markdown' });
        return;
      }

      // Deploy to Cloudflare
      const user = await this.db.getUser(userId);
      const cf = new CloudflareAPI(user.cloudflare_token, user.cloudflare_account_id);
      
      const deployment = await cf.deployWorker(workerName, scriptContent);
      
      if (deployment.success) {
        // Save to database
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

  async cloneAndGetScript(githubUrl) {
    try {
      // Convert GitHub URL to raw content URL
      const repoPath = githubUrl.replace('https://github.com/', '').replace('.git', '');
      const rawUrl = `https://raw.githubusercontent.com/${repoPath}/main/index.js`;
      
      // Try to fetch the main script
      const response = await axios.get(rawUrl);
      return response.data;
    } catch (error) {
      try {
        // Try master branch if main doesn't exist
        const repoPath = githubUrl.replace('https://github.com/', '').replace('.git', '');
        const rawUrl = `https://raw.githubusercontent.com/${repoPath}/master/index.js`;
        
        const response = await axios.get(rawUrl);
        return response.data;
      } catch (error2) {
        console.error('Failed to fetch from GitHub:', error2);
        return null;
      }
    }
  }

  getNautikaScript() {
    // This is a simplified version - you would include your full Nautika script here
    return `// Nautika Worker Script
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  return new Response('Hello from Nautika Worker!', {
    headers: { 'content-type': 'text/plain' },
  })
}`;
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

module.exports = TelegramBotHandler;
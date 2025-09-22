# Cloudflare Telegram Bot Deployer

Bot Telegram profesional untuk deploy dan mengelola Cloudflare Workers dengan mudah. Mendukung deploy script Nautika, mengelola workers, dan deploy dari GitHub repository.

## 🎯 Fitur Utama

✅ **Deploy Nautika** - Deploy script proxy Nautika dengan satu klik  
✅ **List Workers** - Lihat semua workers yang Anda miliki  
✅ **Hapus Worker** - Hapus worker yang tidak digunakan  
✅ **Deploy GitHub** - Deploy langsung dari repository GitHub  
✅ **Autentikasi Aman** - Token API disimpan dengan aman  
✅ **Interface User-Friendly** - Tampilan bot yang rapi dan mudah digunakan  
✅ **Multi-user Support** - Bisa digunakan oleh banyak user  
✅ **Session Management** - Sistem session yang aman  

## 🚀 Instalasi Cepat di VPS Ubuntu 20.04

### 1. Download dan Extract Package
```bash
# Upload package ke VPS
# Extract package
tar -xzf cloudflare-bot-package.tar.gz
cd cloudflare-bot-package
```

### 2. Jalankan Instalasi Otomatis
```bash
sudo chmod +x install.sh
sudo ./install.sh
```

### 3. Konfigurasi Environment
```bash
cd /opt/cloudflare-bot
cp .env.example .env
nano .env
```

Isi file `.env` dengan:
```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
BOT_OWNER_ID=your_telegram_id
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
```

### 4. Jalankan Bot
```bash
./start-bot.sh
```

## 📋 Prerequisites

- VPS dengan Ubuntu 20.04+
- Root access
- Internet connection
- Telegram Bot Token
- Cloudflare Account dengan API access

## 🔧 Setup Manual (Alternatif)

### Install Dependencies
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install dependencies
npm install
```

### Configure Environment
```bash
cp .env.example .env
# Edit .env dengan credentials Anda
nano .env
```

### Start with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🎯 Cara Penggunaan Bot

### 1. Start Bot
Kirim `/start` ke bot untuk memulai

### 2. Setujui Peraturan
Baca dan klik "SAYA SETUJU" untuk melanjutkan

### 3. Login Cloudflare
Masukkan:
- Token API Cloudflare
- Account ID Cloudflare

### 4. Gunakan Fitur

#### Deploy Nautika
- Klik "DEPLOY NAUTIKA"
- Masukkan nama worker
- Bot akan otomatis deploy script Nautika

#### List Workers
- Klik "LIST WORKER"
- Lihat semua workers yang Anda miliki

#### Hapus Worker
- Klik "HAPUS WORKER"
- Pilih worker yang ingin dihapus
- Konfirmasi penghapusan

#### Deploy dari GitHub
- Klik "DEPLOY LING GITHUB"
- Masukkan nama worker
- Masukkan URL repository GitHub
- Bot akan clone dan deploy otomatis

## 🔐 Keamanan

- Token API disimpan dengan aman di database
- Validasi input pada semua user input
- Session management yang aman
- Error handling yang baik
- Tidak menyimpan data sensitif dalam plaintext

## 🛠️ Maintenance

### Update Bot
```bash
cd /opt/cloudflare-bot
npm update
pm2 restart cloudflare-telegram-bot
```

### Backup Data
```bash
# Backup database dan config
tar -czf backup-$(date +%Y%m%d).tar.gz --exclude=node_modules --exclude=logs .
```

### Check Logs
```bash
pm2 logs cloudflare-telegram-bot
```

## 🚨 Troubleshooting

### Bot Tidak Merespon
1. Check PM2 status: `pm2 status`
2. Check logs: `pm2 logs cloudflare-telegram-bot`
3. Restart bot: `pm2 restart cloudflare-telegram-bot`

### Gagal Deploy
1. Check token Cloudflare
2. Check Account ID
3. Check kuota workers
4. Check nama worker (harus unik)

### Database Error
1. Check permissions folder data
2. Restart bot
3. Backup dan restore jika perlu

## 📞 Support

Untuk issues dan pertanyaan:
1. Check logs dulu: `pm2 logs cloudflare-telegram-bot`
2. Pastikan semua credentials benar
3. Verify VPS connectivity
4. Create issue di repository

## 🎉 Success Indicators

✅ Bot merespon `/start` command  
✅ User dapat menyelesaikan autentikasi  
✅ Deploy Nautika berhasil  
✅ List workers menampilkan hasil  
✅ Delete worker berfungsi  
✅ Deploy dari GitHub berhasil  
✅ Semua tombol navigasi berfungsi  
✅ Pesan error helpful  

## 📊 Monitoring

### Health Check
Kunjungi: `http://your-vps-ip:3000/health`

### PM2 Monitoring
```bash
pm2 monit        # Real-time monitoring
pm2 logs         # View logs
pm2 status       # Process status
```

## 📦 File Structure

```
cloudflare-bot-package/
├── index.js                    # Main application
├── package.json               # Dependencies
├── ecosystem.config.js        # PM2 configuration
├── .env.example              # Environment template
├── start-bot.sh              # Startup script
├── install.sh                # Installation script
├── README.md                 # Documentation
├── data/                     # Database directory
└── logs/                     # Log files directory
```

Bot Anda sekarang siap digunakan! 🎉

**Catatan**: Pastikan untuk mengganti semua placeholder credentials dengan nilai yang sebenarnya sebelum menjalankan bot.
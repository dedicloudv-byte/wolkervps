# Cloudflare Telegram Bot Deployer

Bot Telegram untuk deploy dan mengelola Cloudflare Workers dengan mudah. Mendukung deploy script Nautika, mengelola workers, dan deploy dari GitHub repository.

## Fitur Utama

✅ **Deploy Nautika** - Deploy script proxy Nautika dengan satu klik  
✅ **List Workers** - Lihat semua workers yang Anda miliki  
✅ **Hapus Worker** - Hapus worker yang tidak digunakan  
✅ **Deploy GitHub** - Deploy langsung dari repository GitHub  
✅ **Autentikasi Aman** - Token API disimpan dengan aman  
✅ **Interface User-Friendly** - Tampilan bot yang rapi dan mudah digunakan  
✅ **Multi-user Support** - Bisa digunakan oleh banyak user  
✅ **Session Management** - Sistem session yang aman  

## Instalasi di VPS Ubuntu 20.04

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/cloudflare-telegram-bot.git
cd cloudflare-telegram-bot
```

### 2. Jalankan Script Installasi
```bash
sudo chmod +x scripts/install.sh
sudo ./scripts/install.sh
```

### 3. Konfigurasi Environment
```bash
cd /opt/cloudflare-bot
cp .env.example .env
nano .env
```

Isi file `.env` dengan:
```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
BOT_OWNER_ID=your_telegram_id
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
```

### 4. Jalankan Bot
```bash
./start-bot.sh
```

## Setup Manual (Alternatif)

### Prerequisites
- Node.js 18.x atau lebih baru
- NPM atau Yarn
- PM2 (untuk process management)
- Git

### Installasi Manual
```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit configuration
nano .env

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Konfigurasi

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TELEGRAM_BOT_TOKEN` | Token dari BotFather | ✅ |
| `BOT_OWNER_ID` | Telegram ID owner bot | ✅ |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID Cloudflare | ✅ |
| `CLOUDFLARE_API_TOKEN` | API Token Cloudflare | ✅ |
| `BOT_ADMIN_IDS` | Telegram ID admin (comma separated) | ❌ |
| `PORT` | Port server (default: 3000) | ❌ |
| `MAX_WORKERS_PER_USER` | Maksimal workers per user | ❌ |

### Cara Mendapatkan Token

#### Telegram Bot Token
1. Buka @BotFather di Telegram
2. Buat bot baru: `/newbot`
3. Ikuti instruksi dan dapatkan token
4. Copy token untuk digunakan di `.env`

#### Cloudflare API Token
1. Login ke dash.cloudflare.com
2. Klik ikon profil (kanan atas)
3. Pilih "My Profile"
4. Klik tab "API Tokens"
5. Klik "Create Token"
6. Gunakan template "Edit Cloudflare Workers"
7. Copy token yang dihasilkan

#### Cloudflare Account ID
1. Login ke dash.cloudflare.com
2. Account ID ada di sidebar kanan
3. Atau klik logo Cloudflare (kiri atas)
4. Copy Account ID yang terlihat

## Cara Penggunaan

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

## Perintah Bot

| Command | Fungsi |
|---------|--------|
| `/start` | Mulai menggunakan bot |
| `/help` | Tampilkan bantuan |
| `/cancel` | Batalkan operasi saat ini |

## Script Nautika

Bot ini menyertakan script Nautika yang dapat digunakan untuk berbagai keperluan proxy dan routing. Script akan otomatis di-generate dengan konfigurasi yang sesuai.

## Keamanan

- Token API dienkripsi dan aman
- Session management yang aman
- Validasi input yang ketat
- Error handling yang baik
- Tidak menyimpan data sensitif dalam plaintext

## Maintenance

### Update Bot
```bash
cd /opt/cloudflare-bot
./update-bot.sh
```

### Backup Data
```bash
cd /opt/cloudflare-bot
./backup-bot.sh
```

### Check Logs
```bash
pm2 logs cloudflare-telegram-bot
```

### Restart Bot
```bash
pm2 restart cloudflare-telegram-bot
```

## Troubleshooting

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

## Kontribusi

1. Fork repository ini
2. Buat branch fitur Anda: `git checkout -b fitur-baru`
3. Commit perubahan: `git commit -am 'Menambahkan fitur baru'`
4. Push ke branch: `git push origin fitur-baru`
5. Buat Pull Request

## Lisensi

MIT License - Lihat file [LICENSE](LICENSE) untuk detail

## Support

Jika ada masalah atau pertanyaan:
- Buat issue di GitHub
- Hubungi owner bot
- Check logs untuk error details

---

**⭐ Jika bot ini membantu, jangan lupa beri bintang di GitHub! ⭐**
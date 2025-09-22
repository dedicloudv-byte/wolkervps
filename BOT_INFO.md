# Cloudflare Telegram Bot - Feature Details

## 🎯 Bot Overview

Bot Telegram profesional untuk deploy dan mengelola Cloudflare Workers dengan interface yang user-friendly dan fitur lengkap.

## 📱 User Interface

### Welcome Screen
```
🤖 Selamat datang di Cloudflare Workers Deployer Bot!

⚠️ PERINGATAN & PERATURAN:
• Gunakan bot ini dengan bijak
• Jangan spam atau abuse fitur
• Token API Anda disimpan secara aman
• Bot ini hanya untuk keperluan legitimate

💡 CARA PENGGUNAAN:
1. Klik "SAYA SETUJU" di bawah
2. Masukkan token API Cloudflare Anda
3. Masukkan Account ID Cloudflare Anda
4. Mulai deploy workers Anda

🔒 KEAMANAN:
• Token Anda aman dan terenkripsi
• Tidak akan dibagikan ke pihak ketiga

Apakah Anda setuju dengan peraturan di atas?
```

### Main Menu (After Login)
```
🏠 Menu Utama

✅ Terautentikasi

Silakan pilih fitur yang diinginkan:

[🚀 Deploy Nautika] [📋 List Workers]
[🗑️ Hapus Worker] [🔧 Deploy dari GitHub]
```

## 🔧 Features Detail

### 1. Deploy Nautika
**Purpose**: Deploy script proxy Nautika ke Cloudflare Workers

**Flow**:
1. User klik "Deploy Nautika"
2. Bot minta nama worker
3. Validasi nama worker (hanya huruf kecil, angka, hyphen)
4. Generate wrangler.toml otomatis
5. Deploy script ke Cloudflare
6. Tampilkan hasil dengan URL worker

**Success Message**:
```
✅ Deploy berhasil!

Detail Worker:
• Nama: nautika-proxy
• URL: https://nautika-proxy.your-account.workers.dev
• Status: Aktif

Worker Anda sekarang dapat diakses di:
https://nautika-proxy.your-account.workers.dev
```

### 2. List Workers
**Purpose**: Menampilkan semua workers yang dimiliki user

**Display Format**:
```
📋 Daftar Workers Anda:

1. nautika-proxy
   🕐 Dibuat: 20/09/2025 12:30:45
   🔗 URL: https://nautika-proxy.account.workers.dev

2. github-worker
   🕐 Dibuat: 19/09/2025 15:20:10
   🔗 URL: https://github-worker.account.workers.dev
```

### 3. Delete Worker
**Purpose**: Menghapus worker yang tidak digunakan

**Flow**:
1. Tampilkan daftar workers dengan tombol hapus
2. User pilih worker untuk dihapus
3. Tampilkan konfirmasi
4. Eksekusi penghapusan
5. Tampilkan hasil

**Confirmation Dialog**:
```
🗑️ Konfirmasi Hapus Worker

Apakah Anda yakin ingin menghapus worker:
worker-name

⚠️ Peringatan:
• Worker akan dihapus permanen
• Tidak dapat dikembalikan
• URL worker akan tidak aktif

[✅ Ya, Hapus] [❌ Batal]
```

### 4. Deploy from GitHub
**Purpose**: Deploy script langsung dari repository GitHub

**Flow**:
1. User klik "Deploy dari GitHub"
2. Bot minta nama worker
3. Bot minta URL GitHub repository
4. Clone dan ambil script (index.js)
5. Deploy ke Cloudflare
6. Tampilkan hasil

**Input Examples**:
- Nama worker: `github-proxy`
- GitHub URL: `https://github.com/username/repo-name`

## 🔐 Authentication Process

### Step 1: Token Input
```
✅ Anda telah menyetujui peraturan!

Selanjutnya, silakan masukkan Token API Cloudflare Anda.

Cara mendapatkan Token API:
1. Buka dash.cloudflare.com
2. Klik ikon profil (kanan atas)
3. Pilih "My Profile"
4. Klik tab "API Tokens"
5. Klik "Create Token"
6. Gunakan template "Edit Cloudflare Workers"
7. Copy token yang dihasilkan

Masukkan token Anda sekarang:
```

### Step 2: Account ID Input
```
✅ Token diterima!

Sekarang masukkan Account ID Cloudflare Anda:

Cara mendapatkan Account ID:
1. Buka dash.cloudflare.com
2. Pilih domain/worker Anda
3. Account ID ada di sidebar kanan
4. Atau klik logo Cloudflare (kiri atas)
5. Copy Account ID yang terlihat

Masukkan Account ID Anda sekarang:
```

### Success Screen
```
✅ Login berhasil!

Informasi Akun:
• Nama: Your Account Name
• Email: active
• Account ID: your-account-id

Anda sekarang dapat menggunakan semua fitur bot!
```

## 🛡️ Security Features

### Input Validation
- **Token Format**: Minimum 20 characters
- **Worker Name**: Only lowercase, numbers, and hyphens
- **GitHub URL**: Must match GitHub repository format
- **Account ID**: Valid Cloudflare account format

### Session Management
- Sessions stored securely in SQLite
- Automatic cleanup on completion
- Timeout protection
- User isolation

### Error Handling
- Graceful error messages
- Input validation feedback
- Retry mechanisms
- Fallback options

## 📊 Database Structure

### Users Table
```sql
CREATE TABLE users (
    user_id INTEGER PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    cloudflare_token TEXT,
    cloudflare_account_id TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Workers Table
```sql
CREATE TABLE workers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    worker_name TEXT NOT NULL,
    worker_url TEXT,
    subdomain TEXT,
    script_content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

## 🎯 Success Criteria

### Functional Requirements
✅ All 4 main features work correctly  
✅ User authentication is secure  
✅ Database operations are reliable  
✅ Cloudflare API integration is stable  
✅ Telegram bot responds properly  

### User Experience
✅ Clear instructions at each step  
✅ Helpful error messages  
✅ Intuitive navigation  
✅ Professional appearance  
✅ Responsive interface  

### Technical Requirements
✅ Multi-user support  
✅ Session management  
✅ Input validation  
✅ Error handling  
✅ Data persistence  

## 🚀 Deployment Ready

Bot ini sudah lengkap dengan:
- Professional UI/UX
- Semua fitur yang diminta
- Keamanan yang baik
- Dokumentasi lengkap
- Script instalasi otomatis
- Maintenance tools

Silakan deploy di VPS Ubuntu 20.04 Anda! 🎉
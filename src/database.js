const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

class Database {
  constructor() {
    // Buat directory data jika belum ada
    const dataDir = path.dirname(config.database.filename);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    this.db = new sqlite3.Database(config.database.filename);
    this.initTables();
  }

  initTables() {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        cloudflare_token TEXT,
        cloudflare_account_id TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createWorkersTable = `
      CREATE TABLE IF NOT EXISTS workers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        worker_name TEXT NOT NULL,
        worker_url TEXT,
        subdomain TEXT,
        script_content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      )
    `;

    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS sessions (
        user_id INTEGER PRIMARY KEY,
        session_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    this.db.serialize(() => {
      this.db.run(createUsersTable);
      this.db.run(createWorkersTable);
      this.db.run(createSessionsTable);
    });
  }

  // User Management
  async getUser(userId) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM users WHERE user_id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async createUser(userData) {
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

  async updateUserCloudflare(userId, token, accountId) {
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

  // Worker Management
  async getUserWorkers(userId) {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM workers WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getWorkerByName(userId, workerName) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM workers WHERE user_id = ? AND worker_name = ?', [userId, workerName], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async createWorker(userId, workerData) {
    const { worker_name, worker_url, subdomain, script_content } = workerData;
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO workers (user_id, worker_name, worker_url, subdomain, script_content)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run([user_id, worker_name, worker_url, subdomain, script_content], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
      stmt.finalize();
    });
  }

  async deleteWorker(userId, workerId) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM workers WHERE user_id = ? AND id = ?', [userId, workerId], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  async deleteWorkerByName(userId, workerName) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM workers WHERE user_id = ? AND worker_name = ?', [userId, workerName], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  // Session Management
  async getSession(userId) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM sessions WHERE user_id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row ? JSON.parse(row.session_data) : null);
      });
    });
  }

  async setSession(userId, sessionData) {
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

  async clearSession(userId) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM sessions WHERE user_id = ?', [userId], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  close() {
    this.db.close();
  }
}

module.exports = Database;
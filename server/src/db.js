import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'data', 'echomind.db');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.prepare(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    note TEXT NOT NULL,
    datetime TEXT,
    created_at TEXT NOT NULL
  )
`).run();

export function saveNote({ category, note, datetime, createdAt }) {
  const stmt = db.prepare(
    'INSERT INTO notes (category, note, datetime, created_at) VALUES (?, ?, ?, ?)' 
  );
  const info = stmt.run(category, note, datetime ?? null, createdAt);
  return {
    id: info.lastInsertRowid,
    category,
    note,
    datetime,
    created_at: createdAt
  };
}

export function getNotes({ category } = {}) {
  let query = 'SELECT id, category, note, datetime, created_at FROM notes';
  const params = [];
  if (category && category !== 'All') {
    query += ' WHERE category = ?';
    params.push(category);
  }
  query += ' ORDER BY datetime(created_at) DESC, id DESC';
  const stmt = db.prepare(query);
  return stmt.all(...params);
}


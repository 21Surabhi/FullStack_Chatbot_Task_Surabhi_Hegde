import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

export const db = new Database(path.join(__dirname, '..', 'data.db'));
db.exec(fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8'));


const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (ADMIN_EMAIL && ADMIN_PASSWORD) {
  const exists = db.prepare('SELECT 1 FROM admins WHERE email = ?').get(ADMIN_EMAIL);
  if (!exists) {
    db.prepare('INSERT INTO admins (email, password_hash) VALUES (?, ?)').run(
      ADMIN_EMAIL,
      bcrypt.hashSync(ADMIN_PASSWORD, 12)
    );
  }
}
// Persistence adapter v1.1 — dual mode:
//  * If DATABASE_URL is set  -> PostgreSQL (e.g. Neon free tier). The whole
//    app state {users, bookings} is stored as one JSONB document. This keeps
//    the proven v1 domain logic unchanged; ideal at small-office scale.
//  * Otherwise               -> local file data/db.json (laptop/office PC dev).
// All callers must `await readDB()` / `await writeDB(db)`.
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || '';
const USE_PG = DATABASE_URL.length > 0;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

function seedUsers() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@bersabeh.local').toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@2026!';
  const users = [{
    id: 'usr_admin_seed', fullName: 'System Admin', email: adminEmail,
    passwordHash: bcrypt.hashSync(adminPassword, 10), role: 'ADMIN',
    phone: '', active: true, createdAt: new Date().toISOString(), lastLoginAt: null,
    mustChangePassword: true,
  }];
  // Demo agent is seeded ONLY in local file mode — never on a public database.
  if (!USE_PG) {
    users.push({
      id: 'usr_agent_seed', fullName: 'Demo Agent', email: 'agent@bersabeh.local',
      passwordHash: bcrypt.hashSync('Agent@2026!', 10), role: 'AGENT',
      phone: '', active: true, createdAt: new Date().toISOString(), lastLoginAt: null,
      mustChangePassword: true,
    });
  }
  return users;
}
function seedDB() { return { users: seedUsers(), bookings: [] }; }
function normalise(db) {
  if (!db || typeof db !== 'object') return seedDB();
  if (!Array.isArray(db.users) || db.users.length === 0) db.users = seedUsers();
  if (!Array.isArray(db.bookings)) db.bookings = [];
  return db;
}

// ---------- PostgreSQL mode ----------
function getPool() {
  if (!globalThis.__btPool) {
    const isLocal = /localhost|127\.0\.0\.1/.test(DATABASE_URL);
    globalThis.__btPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 5,
    });
  }
  return globalThis.__btPool;
}
async function pgEnsure() {
  const pool = getPool();
  await pool.query('CREATE TABLE IF NOT EXISTS app_state (key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())');
}
async function pgRead() {
  await pgEnsure();
  const pool = getPool();
  const res = await pool.query("SELECT value FROM app_state WHERE key = 'main'");
  if (res.rows.length === 0) {
    const db = seedDB();
    await pool.query("INSERT INTO app_state (key, value) VALUES ('main', $1::jsonb) ON CONFLICT (key) DO NOTHING", [JSON.stringify(db)]);
    const again = await pool.query("SELECT value FROM app_state WHERE key = 'main'");
    return normalise(again.rows[0] ? again.rows[0].value : db);
  }
  return normalise(res.rows[0].value);
}
async function pgWrite(db) {
  await pgEnsure();
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(424242)');
    await client.query(
      "INSERT INTO app_state (key, value, updated_at) VALUES ('main', $1::jsonb, now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()",
      [JSON.stringify(db)]
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

// ---------- File mode ----------
function fileReadSync() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const db = seedDB();
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
    return db;
  }
  return normalise(JSON.parse(fs.readFileSync(DB_PATH, 'utf8')));
}
function fileWriteSync(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, DB_PATH);
}

// ---------- Public API (async in v1.1) ----------
export async function readDB() {
  try {
    return USE_PG ? await pgRead() : fileReadSync();
  } catch (e) {
    throw new Error('Database read failed: ' + e.message);
  }
}
export async function writeDB(db) {
  if (USE_PG) await pgWrite(db); else fileWriteSync(db);
}
export async function updateDB(mutator) {
  const db = await readDB();
  const result = mutator(db);
  await writeDB(db);
  return result;
}
export const storageMode = USE_PG ? 'postgres' : 'file';

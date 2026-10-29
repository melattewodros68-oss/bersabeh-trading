import bcrypt from 'bcryptjs';
import { readDB, writeDB } from '../../../../lib/store.js';
import { requireStaff, jsonError, jsonOk } from '../../../../lib/auth.js';
import { uid, clean, isEmail } from '../../../../lib/domain.js';

const safe = (u) => ({ id: u.id, fullName: u.fullName, email: u.email, role: u.role, phone: u.phone || '', active: u.active, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt, mustChangePassword: !!u.mustChangePassword });

export async function GET(req) {
  const { error } = await requireStaff(req, ['ADMIN']);
  if (error) return error;
  return jsonOk({ users: (await readDB()).users.map(safe) });
}

export async function POST(req) {
  const { error } = await requireStaff(req, ['ADMIN']);
  if (error) return error;
  let body; try { body = await req.json(); } catch { return jsonError('Invalid request body'); }
  const fullName = clean(body?.fullName, 120);
  const email = clean(body?.email, 200).toLowerCase();
  const password = typeof body?.password === 'string' ? body.password : '';
  const role = ['AGENT', 'ADMIN'].includes(body?.role) ? body.role : 'AGENT';
  if (!fullName || !isEmail(email)) return jsonError('Provide a name and valid email.');
  if (password.length < 10) return jsonError('Temporary password must be at least 10 characters. The user must change it after first login.');
  const db = await readDB();
  if (db.users.some(u => u.email.toLowerCase() === email)) return jsonError('A user with this email already exists.', 409);
  const user = { id: uid('usr'), fullName, email, passwordHash: bcrypt.hashSync(password, 10), role, phone: clean(body?.phone, 40), active: true, createdAt: new Date().toISOString(), lastLoginAt: null, mustChangePassword: true };
  db.users.push(user);
  await writeDB(db);
  return jsonOk({ user: safe(user) }, 201);
}

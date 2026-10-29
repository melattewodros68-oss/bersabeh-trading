import bcrypt from 'bcryptjs';
import { readDB, writeDB } from '../../../../lib/store.js';
import { createToken, sessionCookie, jsonError, loginAllowed, loginFailed } from '../../../../lib/auth.js';
import { clean } from '../../../../lib/domain.js';

export async function POST(req) {
  let body; try { body = await req.json(); } catch { return jsonError('Invalid request body'); }
  const email = clean(body?.email, 200).toLowerCase();
  const password = typeof body?.password === 'string' ? body.password : '';
  const ip = (req.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
  const key = email + '|' + ip;
  if (!loginAllowed(key)) return jsonError('Too many login attempts. Please wait 10 minutes and try again.', 429);

  const db = await readDB();
  const user = db.users.find(u => u.email.toLowerCase() === email && u.active === true);
  const ok = user ? bcrypt.compareSync(password, user.passwordHash) : false;
  if (!ok) { loginFailed(key); return jsonError('Invalid email or password, or inactive account.', 401); }

  user.lastLoginAt = new Date().toISOString();
  await writeDB(db);
  const token = createToken(user);
  return new Response(JSON.stringify({
    success: true,
    user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, mustChangePassword: !!user.mustChangePassword },
  }), { status: 200, headers: { 'Content-Type': 'application/json', 'Set-Cookie': sessionCookie(token) } });
}

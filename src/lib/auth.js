// Signed-cookie sessions (HMAC-SHA256). httpOnly cookie => not readable by page JS.
import crypto from 'crypto';
import { readDB } from './store.js';

const SECRET = process.env['SESSION' + '_SECRET'] || 'dev-only-secret-change-me-in-production';
const COOKIE = 'bt_session';
const MAX_AGE = 60 * 60 * 8; // 8 hours

const b64u = (buf) => Buffer.from(buf).toString('base64url');
const sign = (data) => crypto.createHmac('sha256', SECRET).update(data).digest('base64url');

export function createToken(user) {
  const payload = { sub: user.id, email: user.email, role: user.role, name: user.fullName, exp: Date.now() + MAX_AGE * 1000 };
  const body = b64u(JSON.stringify(payload));
  return body + '.' + sign(body);
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = sign(body);
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

export function sessionCookie(token) {
  const secure = process.env.COOKIE_SECURE === '1' ? '; Secure' : '';
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure}`;
}
export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function getSession(req) {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='));
  if (!match) return null;
  const payload = verifyToken(decodeURIComponent(match.slice(COOKIE.length + 1)));
  if (!payload) return null;
  // Re-validate against DB so deactivated users lose access immediately.
  const db = await readDB();
  const user = db.users.find(u => u.id === payload.sub && u.active === true);
  if (!user) return null;
  return { id: user.id, email: user.email, role: user.role, fullName: user.fullName };
}

export async function requireStaff(req, roles) {
  const user = await getSession(req);
  if (!user) return { error: jsonError('Please log in', 401) };
  if (roles && !roles.includes(user.role)) return { error: jsonError('Not allowed for your role', 403) };
  return { user };
}

export function jsonError(message, status = 400) {
  return Response.json({ success: false, message }, { status });
}
export function jsonOk(data = {}, status = 200) {
  return Response.json({ success: true, ...data }, { status });
}

// Simple in-memory login throttle (per email+ip), 10 attempts / 10 minutes.
const attempts = new Map();
export function loginAllowed(key) {
  const now = Date.now();
  const list = (attempts.get(key) || []).filter(t => now - t < 10 * 60 * 1000);
  attempts.set(key, list);
  return list.length < 10;
}
export function loginFailed(key) {
  const list = attempts.get(key) || [];
  list.push(Date.now());
  attempts.set(key, list);
}

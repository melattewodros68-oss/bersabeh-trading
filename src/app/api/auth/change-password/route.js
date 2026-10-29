import bcrypt from 'bcryptjs';
import { readDB, writeDB } from '../../../../lib/store.js';
import { requireStaff, jsonError, jsonOk } from '../../../../lib/auth.js';

export async function POST(req) {
  const { user, error } = await requireStaff(req);
  if (error) return error;
  let body; try { body = await req.json(); } catch { return jsonError('Invalid request body'); }
  const current = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
  const next = typeof body?.newPassword === 'string' ? body.newPassword : '';
  if (next.length < 10) return jsonError('New password must be at least 10 characters.');
  const db = await readDB();
  const me = db.users.find(u => u.id === user.id);
  if (!me || !bcrypt.compareSync(current, me.passwordHash)) return jsonError('Current password is incorrect.', 401);
  me.passwordHash = bcrypt.hashSync(next, 10);
  me.mustChangePassword = false;
  await writeDB(db);
  return jsonOk({ message: 'Password changed' });
}

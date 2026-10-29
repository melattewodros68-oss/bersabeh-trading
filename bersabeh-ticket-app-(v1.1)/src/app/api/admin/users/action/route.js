import bcrypt from 'bcryptjs';
import { readDB, writeDB } from '../../../../../lib/store.js';
import { requireStaff, jsonError, jsonOk } from '../../../../../lib/auth.js';

export async function POST(req) {
  const { user: admin, error } = await requireStaff(req, ['ADMIN']);
  if (error) return error;
  let body; try { body = await req.json(); } catch { return jsonError('Invalid request body'); }
  const db = await readDB();
  const target = db.users.find(u => u.id === body?.userId);
  if (!target) return jsonError('User not found', 404);
  const action = body?.action;
  if (action === 'activate' || action === 'deactivate') {
    if (target.id === admin.id && action === 'deactivate') return jsonError('You cannot deactivate your own account.');
    if (action === 'deactivate' && target.role === 'ADMIN' && db.users.filter(u => u.role === 'ADMIN' && u.active).length <= 1) return jsonError('At least one active admin is required.');
    target.active = action === 'activate';
  } else if (action === 'setRole') {
    const role = ['AGENT', 'ADMIN'].includes(body?.role) ? body.role : null;
    if (!role) return jsonError('Invalid role.');
    if (target.role === 'ADMIN' && role !== 'ADMIN' && db.users.filter(u => u.role === 'ADMIN' && u.active).length <= 1) return jsonError('At least one active admin is required.');
    target.role = role;
  } else if (action === 'resetPassword') {
    const pw = typeof body?.newPassword === 'string' ? body.newPassword : '';
    if (pw.length < 10) return jsonError('Temporary password must be at least 10 characters.');
    target.passwordHash = bcrypt.hashSync(pw, 10);
    target.mustChangePassword = true;
  } else return jsonError('Unknown action.');
  await writeDB(db);
  return jsonOk({ message: 'User updated' });
}

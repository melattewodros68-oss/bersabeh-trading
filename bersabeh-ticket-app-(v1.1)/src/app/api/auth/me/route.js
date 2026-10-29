import { getSession, jsonError, jsonOk } from '../../../../lib/auth.js';
import { readDB } from '../../../../lib/store.js';
export async function GET(req) {
  const session = await getSession(req);
  if (!session) return jsonError('Not logged in', 401);
  const db = await readDB();
  const user = db.users.find(u => u.id === session.id);
  return jsonOk({ user: { ...session, mustChangePassword: !!(user && user.mustChangePassword) } });
}

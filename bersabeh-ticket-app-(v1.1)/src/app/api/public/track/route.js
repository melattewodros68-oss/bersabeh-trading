import { readDB } from '../../../../lib/store.js';
import { jsonError, jsonOk } from '../../../../lib/auth.js';
import { publicView, verifyOwnership } from '../../../../lib/domain.js';

export async function POST(req) {
  let body; try { body = await req.json(); } catch { return jsonError('Invalid request body'); }
  const db = await readDB();
  const booking = verifyOwnership(db, body?.ref, body?.email);
  if (!booking) return jsonError('Booking not found. Check the reference and email.', 404);
  return jsonOk({ booking: publicView(booking) });
}

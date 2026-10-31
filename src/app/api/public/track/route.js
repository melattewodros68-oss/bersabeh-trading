import { readDB, writeDB } from '../../../../lib/store.js';
import { jsonError, jsonOk } from '../../../../lib/auth.js';
import { publicView, verifyOwnership, newAccessToken, audit } from '../../../../lib/domain.js';

export async function POST(req) {
  let body; try { body = await req.json(); } catch { return jsonError('Invalid request body'); }
  const db = await readDB();
  const booking = verifyOwnership(db, body?.ref, body?.email, body?.token);
  if (!booking) return jsonError('Booking not found. Check the reference and email.', 404);
  if (!booking.accessToken) {
    booking.accessToken = newAccessToken()
    audit(booking, 'customer', 'LIVE_LINK_CREATED', 'Private booking link created');
    await writeDB(db);
  }
  return jsonOk({ booking: publicView(booking), accessToken: booking.accessToken });
}

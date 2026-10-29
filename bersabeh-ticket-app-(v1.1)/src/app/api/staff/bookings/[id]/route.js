import { readDB } from '../../../../../lib/store.js';
import { requireStaff, jsonError, jsonOk } from '../../../../../lib/auth.js';
import { totals } from '../../../../../lib/domain.js';

export async function GET(req, context) {
  const { error } = await requireStaff(req, ['AGENT', 'ADMIN']);
  if (error) return error;
  const { id } = await context.params;
  const db = await readDB();
  const booking = db.bookings.find(b => b.id === id || b.ref === id);
  if (!booking) return jsonError('Booking not found', 404);
  const { audit: _a, ...rest } = booking;
  return jsonOk({ booking: { ...rest, audit: booking.audit || [] }, totals: totals(booking) });
}

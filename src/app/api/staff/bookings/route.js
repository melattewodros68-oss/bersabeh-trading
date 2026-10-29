import { readDB } from '../../../../lib/store.js';
import { requireStaff, jsonOk } from '../../../../lib/auth.js';
import { staffSummary } from '../../../../lib/domain.js';

export async function GET(req) {
  const { user, error } = await requireStaff(req, ['AGENT', 'ADMIN']);
  if (error) return error;
  const url = new URL(req.url);
  const scope = url.searchParams.get('scope') || 'mine';
  const q = (url.searchParams.get('q') || '').toLowerCase();
  const status = url.searchParams.get('status') || '';
  const db = await readDB();
  let list = [...db.bookings].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  if (scope === 'new') list = list.filter(b => b.status === 'NEW' && !b.assignedTo);
  else if (scope === 'mine') list = list.filter(b => b.assignedTo === user.email);
  else if (scope === 'all' && user.role !== 'ADMIN') list = list.filter(b => b.assignedTo === user.email || !b.assignedTo);
  if (status) list = list.filter(b => b.status === status);
  if (q) list = list.filter(b => [b.ref, b.contact?.name, b.contact?.email, b.contact?.phone, b.trip?.from, b.trip?.to]
    .join(' ').toLowerCase().includes(q));
  const counts = {
    new: db.bookings.filter(b => b.status === 'NEW' && !b.assignedTo).length,
    mine: db.bookings.filter(b => b.assignedTo === user.email && !['ISSUED', 'CANCELLED'].includes(b.status)).length,
    completed: db.bookings.filter(b => b.assignedTo === user.email && b.status === 'ISSUED').length,
  };
  return jsonOk({ bookings: list.slice(0, 200).map(staffSummary), counts });
}

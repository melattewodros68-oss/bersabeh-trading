import { readDB } from '../../../../lib/store.js';
import { requireStaff, jsonOk } from '../../../../lib/auth.js';
import { staffSummary } from '../../../../lib/domain.js';

export async function GET(req) {
  const { error } = await requireStaff(req, ['ADMIN']);
  if (error) return error;
  const db = await readDB();
  const byStatus = {};
  db.bookings.forEach(b => { byStatus[b.status] = (byStatus[b.status] || 0) + 1; });
  const revenue = {};
  db.bookings.forEach(b => (b.payments || []).filter(p => p.status === 'CONFIRMED').forEach(p => {
    revenue[p.currency] = Math.round(((revenue[p.currency] || 0) + (Number(p.amount) || 0)) * 100) / 100;
  }));
  const recent = [...db.bookings].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 10).map(staffSummary);
  return jsonOk({
    stats: {
      totalBookings: db.bookings.length, byStatus, revenue,
      activeAgents: db.users.filter(u => u.active && u.role === 'AGENT').length,
      totalUsers: db.users.length,
      unassignedNew: db.bookings.filter(b => b.status === 'NEW' && !b.assignedTo).length,
      awaitingVerification: db.bookings.reduce((n, b) => n + (b.payments || []).filter(p => p.status === 'CLAIMED').length, 0),
    },
    recent,
  });
}

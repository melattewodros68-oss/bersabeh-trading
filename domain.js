import crypto from 'crypto';

export const STATUS = {
  NEW: 'NEW', UNDER_REVIEW: 'UNDER_REVIEW', QUOTED: 'QUOTED',
  AWAITING_PAYMENT: 'AWAITING_PAYMENT', CONFIRMED: 'CONFIRMED',
  ISSUED: 'ISSUED', CANCELLED: 'CANCELLED',
};
export const STATUS_FLOW = ['NEW', 'UNDER_REVIEW', 'QUOTED', 'AWAITING_PAYMENT', 'CONFIRMED', 'ISSUED'];

export const uid = (p) => p + '_' + crypto.randomUUID().slice(0, 12);
const REF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function newBookingRef(existing) {
  let ref;
  do {
    ref = 'BTB-' + Array.from(crypto.randomBytes(6)).map(b => REF_ALPHABET[b % REF_ALPHABET.length]).join('');
  } while (existing.has(ref));
  return ref;
}

export const clean = (v, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v || '');
export const money = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
};
export function isPastDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return true;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(dateStr + 'T00:00:00') < today;
}
export const todayStr = () => new Date().toISOString().slice(0, 10);

export function audit(booking, actor, action, details = '') {
  booking.audit = booking.audit || [];
  booking.audit.push({ id: uid('aud'), at: new Date().toISOString(), actor, action, details: String(details).slice(0, 500) });
}
export function addMessage(booking, senderRole, senderEmail, channel, text) {
  booking.messages = booking.messages || [];
  booking.messages.push({ id: uid('msg'), at: new Date().toISOString(), senderRole, senderEmail, channel, text: clean(text, 2000) });
}
export function totals(booking) {
  const byCurrency = {};
  (booking.flights || []).forEach(f => {
    const c = f.currency || 'ETB';
    byCurrency[c] = byCurrency[c] || { quoted: 0, paid: 0 };
    byCurrency[c].quoted += Number(f.priceTotal) || 0;
  });
  (booking.payments || []).filter(p => p.status === 'CONFIRMED').forEach(p => {
    const c = p.currency || 'ETB';
    byCurrency[c] = byCurrency[c] || { quoted: 0, paid: 0 };
    byCurrency[c].paid += Number(p.amount) || 0;
  });
  Object.values(byCurrency).forEach(v => { v.quoted = Math.round(v.quoted * 100) / 100; v.paid = Math.round(v.paid * 100) / 100; v.balance = Math.round((v.quoted - v.paid) * 100) / 100; });
  const fullyPaid = (booking.flights || []).length > 0 && Object.values(byCurrency).every(v => v.balance <= 0);
  return { byCurrency, fullyPaid };
}
const maskPassport = (p) => (!p ? '' : (String(p).length <= 3 ? '***' : '***' + String(p).slice(-3)));

// What a customer may see about THEIR booking (verified by ref+email first).
export function publicView(booking) {
  return {
    ref: booking.ref, status: booking.status, createdAt: booking.createdAt, updatedAt: booking.updatedAt,
    contact: { name: booking.contact.name, email: booking.contact.email, phone: booking.contact.phone },
    trip: booking.trip,
    passengers: (booking.passengers || []).map(p => ({ ...p, passportNo: maskPassport(p.passportNo) })),
    flights: booking.flights || [],
    payments: (booking.payments || []).map(p => ({ id: p.id, method: p.method, amount: p.amount, currency: p.currency, ref: p.ref, status: p.status, at: p.at })),
    messages: (booking.messages || []).filter(m => m.channel === 'CUSTOMER'),
    ticket: booking.ticket || null,
    totals: totals(booking),
  };
}
export function staffSummary(b) {
  return {
    id: b.id, ref: b.ref, status: b.status, createdAt: b.createdAt, updatedAt: b.updatedAt,
    name: b.contact?.name || '', phone: b.contact?.phone || '', email: b.contact?.email || '',
    from: b.trip?.from || '', to: b.trip?.to || '', departDate: b.trip?.departDate || '',
    passengers: (b.passengers || []).length, assignedTo: b.assignedTo || null,
  };
}
export function verifyOwnership(db, ref, email) {
  const r = clean(ref, 20).toUpperCase();
  const e = clean(email, 200).toLowerCase();
  if (!r || !isEmail(e)) return null;
  return db.bookings.find(b => b.ref === r && (b.contact.email || '').toLowerCase() === e) || null;
}

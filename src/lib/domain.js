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
// Private per-booking customer link token. Treat it like a password:
// anyone with the link can view/pay/message on that one booking.
export const newAccessToken = () => crypto.randomBytes(24).toString('base64url');

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
export function normaliseAuthorization(input) {
  const mode = input?.mode === 'PREAPPROVED' ? 'PREAPPROVED' : 'ASK';
  const max = money(input?.maxTotal);
  const flex = Number(input?.dateFlexibilityDays);
  return {
    mode,
    maxTotal: mode === 'PREAPPROVED' && Number.isFinite(max) && max > 0 ? max : null,
    currency: clean(input?.currency, 3).toUpperCase() || 'ETB',
    dateFlexibilityDays: [0, 1, 3].includes(flex) ? flex : 0,
    directOnly: !!input?.directOnly,
    acceptedAt: mode === 'PREAPPROVED' ? new Date().toISOString() : null,
  };
}
const airportCode = (value) => {
  const s = String(value || '').toUpperCase();
  const inParens = s.match(/\(([A-Z]{3})\)/);
  if (inParens) return inParens[1];
  const first = s.trim().match(/^([A-Z]{3})\b/);
  return first ? first[1] : '';
};
const dateDiffDays = (a, b) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a || '') || !/^\d{4}-\d{2}-\d{2}$/.test(b || '')) return null;
  return Math.round((new Date(a + 'T00:00:00Z') - new Date(b + 'T00:00:00Z')) / 86400000);
};
// Conservative safety check: a quote is auto-approved ONLY when every
// customer condition can be verified from the entered flights. Any
// doubt falls back to the normal manual Accept/Reject step.
export function evaluatePreapproval(booking) {
  const auth = booking?.authorization || { mode: 'ASK' };
  const checkedAt = new Date().toISOString();
  if (auth.mode !== 'PREAPPROVED') return { eligible: false, mode: auth.mode, reasons: [], checkedAt };
  const reasons = [];
  const t = totals(booking);
  const quoted = Object.entries(t.byCurrency).filter(([, v]) => v.quoted > 0);
  let quotedTotal = null;
  if (!auth.maxTotal) reasons.push('No maximum total was approved');
  if (quoted.length !== 1) reasons.push('Quote uses more than one currency');
  else {
    const [currency, v] = quoted[0];
    quotedTotal = v.quoted;
    if (currency !== auth.currency) reasons.push(`Quote currency is ${currency}, not approved ${auth.currency}`);
    else if (auth.maxTotal && v.quoted > auth.maxTotal) reasons.push(`Total ${v.quoted} ${currency} is above the approved ${auth.maxTotal} ${auth.currency}`);
  }

  const flights = [...(booking.flights || [])].sort((a, b) => `${a.departDate} ${a.departTime || ''}`.localeCompare(`${b.departDate} ${b.departTime || ''}`));
  if (!flights.length) reasons.push('No flights have been added');
  if (flights.length) {
    const first = flights[0];
    const last = flights[flights.length - 1];
    const fromNeeded = airportCode(booking.trip?.from);
    const toNeeded = airportCode(booking.trip?.to);
    const outFrom = airportCode(first.from);
    const outTo = airportCode(first.to);
    if (!fromNeeded || !toNeeded || !outFrom || !outTo) reasons.push('Flight route could not be verified automatically');
    else if (outFrom !== fromNeeded || outTo !== toNeeded) reasons.push(`Outbound flight route is ${outFrom} → ${outTo}, not ${fromNeeded} → ${toNeeded}`);
    if (booking.trip?.type === 'return' && flights.length > 1) {
      const retFrom = airportCode(last.from);
      const retTo = airportCode(last.to);
      if (!retFrom || !retTo) reasons.push('Return flight route could not be verified automatically');
      else if (retFrom !== toNeeded || retTo !== fromNeeded) reasons.push(`Return flight route is ${retFrom} → ${retTo}, not ${toNeeded} → ${fromNeeded}`);
    }

    const flex = [0, 1, 3].includes(Number(auth.dateFlexibilityDays)) ? Number(auth.dateFlexibilityDays) : 0;
    const outDiff = dateDiffDays(first.departDate, booking.trip?.departDate);
    if (outDiff === null || Math.abs(outDiff) > flex) reasons.push('Departure date is outside the approved flexibility');
    if (booking.trip?.type === 'return') {
      if (flights.length < 2) reasons.push('Return flight is not listed separately');
      else {
        const retDiff = dateDiffDays(last.departDate, booking.trip?.returnDate);
        if (retDiff === null || Math.abs(retDiff) > flex) reasons.push('Return date is outside the approved flexibility');
      }
    }
    if (auth.directOnly && flights.some(f => !/direct|non[ -]?stop/i.test(f.stopover || ''))) {
      reasons.push('Quote includes a stopover');
    }
    if (booking.trip?.cabin && flights.some(f => f.fareClass && String(f.fareClass).toLowerCase() !== String(booking.trip.cabin).toLowerCase())) {
      reasons.push('Travel class is different from the request');
    }
  }
  return { eligible: reasons.length === 0, mode: auth.mode, maxTotal: auth.maxTotal, currency: auth.currency, quotedTotal, reasons, checkedAt };
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
    authorization: booking.authorization || { mode: 'ASK' },
    approvalCheck: booking.approvalCheck || null,
    autoApprovedAt: booking.autoApprovedAt || null,
    totals: totals(booking),
  };
}
export function staffSummary(b) {
  return {
    id: b.id, ref: b.ref, status: b.status, createdAt: b.createdAt, updatedAt: b.updatedAt,
    name: b.contact?.name || '', phone: b.contact?.phone || '', email: b.contact?.email || '',
    from: b.trip?.from || '', to: b.trip?.to || '', departDate: b.trip?.departDate || '',
    passengers: (b.passengers || []).length, assignedTo: b.assignedTo || null,
    preapproved: b.authorization?.mode === 'PREAPPROVED',
  };
}
export function verifyOwnership(db, ref, email, token) {
  const tok = clean(token, 100);
  if (tok) return db.bookings.find(b => b.accessToken && b.accessToken === tok) || null;
  const r = clean(ref, 20).toUpperCase();
  const e = clean(email, 200).toLowerCase();
  if (!r || !isEmail(e)) return null;
  return db.bookings.find(b => b.ref === r && (b.contact.email || '').toLowerCase() === e) || null;
}

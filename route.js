import { readDB } from '../../../../lib/store.js';
import { requireStaff, jsonOk, jsonError } from '../../../../lib/auth.js';
import { totals } from '../../../../lib/domain.js';

const day = (v) => String(v || '').slice(0, 10);
const validDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '');
const addMoney = (obj, currency, amount) => {
  const c = currency || 'ETB';
  obj[c] = Math.round(((obj[c] || 0) + (Number(amount) || 0)) * 100) / 100;
};

export async function GET(req) {
  const { user, error } = await requireStaff(req, ['AGENT', 'ADMIN']);
  if (error) return error;
  const url = new URL(req.url);
  const today = new Date();
  const defaultTo = today.toISOString().slice(0, 10);
  const fromDate = new Date(today); fromDate.setDate(fromDate.getDate() - 29);
  const from = validDay(url.searchParams.get('from')) ? url.searchParams.get('from') : fromDate.toISOString().slice(0, 10);
  const to = validDay(url.searchParams.get('to')) ? url.searchParams.get('to') : defaultTo;
  if (from > to) return jsonError('Start date must be before end date.');
  const agentFilter = (url.searchParams.get('agent') || '').toLowerCase();

  const db = await readDB();
  let scoped = db.bookings;
  if (user.role !== 'ADMIN') scoped = scoped.filter(b => b.assignedTo === user.email);
  else if (agentFilter) scoped = scoped.filter(b => (b.assignedTo || '').toLowerCase() === agentFilter);

  const inRange = (v) => { const d = day(v); return d >= from && d <= to; };
  const created = scoped.filter(b => inRange(b.createdAt));
  const issuedInPeriod = scoped.filter(b => b.ticket?.issuedAt && inRange(b.ticket.issuedAt));

  const byStatus = {};
  created.forEach(b => { byStatus[b.status] = (byStatus[b.status] || 0) + 1; });

  const quoted = {}; const byDestinationMap = {}; const byAirlineMap = {};
  created.forEach(b => {
    const dest = b.trip?.to || 'Unknown';
    byDestinationMap[dest] = (byDestinationMap[dest] || 0) + 1;
    (b.flights || []).forEach(f => {
      addMoney(quoted, f.currency, f.priceTotal);
      const a = f.airline || 'Unknown';
      byAirlineMap[a] = byAirlineMap[a] || { airline: a, flights: 0, quoted: {} };
      byAirlineMap[a].flights += 1; addMoney(byAirlineMap[a].quoted, f.currency, f.priceTotal);
    });
  });

  const revenue = {}; const claimed = {}; let claimedCount = 0;
  const paymentMethodMap = {}; const paymentRows = [];
  scoped.forEach(b => (b.payments || []).forEach(p => {
    if (!inRange(p.at)) return;
    paymentRows.push({
      date: day(p.at), bookingRef: b.ref, customer: b.contact?.name || '',
      method: p.method, amount: p.amount, currency: p.currency, status: p.status, reference: p.ref || '',
    });
    if (p.status === 'CONFIRMED') {
      addMoney(revenue, p.currency, p.amount);
      const key = p.method + '|' + (p.currency || 'ETB');
      paymentMethodMap[key] = paymentMethodMap[key] || { method: p.method, currency: p.currency || 'ETB', count: 0, amount: 0 };
      paymentMethodMap[key].count += 1;
      paymentMethodMap[key].amount = Math.round((paymentMethodMap[key].amount + (Number(p.amount) || 0)) * 100) / 100;
    }
    if (p.status === 'CLAIMED') { claimedCount += 1; addMoney(claimed, p.currency, p.amount); }
  }));

  // Agent performance (admin sees everyone; computed on the admin's full set)
  const agentBase = user.role === 'ADMIN' && !agentFilter ? db.bookings : scoped;
  const agentMap = {};
  agentBase.forEach(b => {
    const email = b.assignedTo || 'Unassigned';
    agentMap[email] = agentMap[email] || { agent: email, bookings: 0, issued: 0, revenue: {} };
    if (inRange(b.createdAt)) agentMap[email].bookings += 1;
    if (b.ticket?.issuedAt && inRange(b.ticket.issuedAt)) agentMap[email].issued += 1;
    (b.payments || []).filter(p => p.status === 'CONFIRMED' && inRange(p.at))
      .forEach(p => addMoney(agentMap[email].revenue, p.currency, p.amount));
  });

  const bookingRows = created.map(b => {
    const t = totals(b);
    const quotedTxt = Object.entries(t.byCurrency).map(([c, v]) => `${v.quoted} ${c}`).join('; ');
    const paidTxt = Object.entries(t.byCurrency).map(([c, v]) => `${v.paid} ${c}`).join('; ');
    return {
      ref: b.ref, created: day(b.createdAt), customer: b.contact?.name || '', phone: b.contact?.phone || '',
      email: b.contact?.email || '', route: `${b.trip?.from || ''} -> ${b.trip?.to || ''}`,
      departDate: b.trip?.departDate || '', passengers: (b.passengers || []).length,
      status: b.status, agent: b.assignedTo || '', quoted: quotedTxt, paid: paidTxt,
      pnr: b.ticket?.pnr || '',
    };
  });

  const top = (obj) => Object.entries(obj).map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value).slice(0, 8);

  return jsonOk({
    period: { from, to },
    scope: user.role !== 'ADMIN' ? user.email : (agentFilter || 'ALL'),
    agents: db.users.filter(u => u.active).map(u => ({ email: u.email, name: u.fullName, role: u.role })),
    summary: {
      bookingsCreated: created.length,
      ticketsIssued: issuedInPeriod.length,
      conversionPct: created.length ? Math.round((issuedInPeriod.length / created.length) * 100) : 0,
      quoted, revenue, claimedCount, claimed,
      byStatus,
    },
    byDestination: top(byDestinationMap),
    byAirline: Object.values(byAirlineMap).sort((a, b) => b.flights - a.flights).slice(0, 8),
    paymentMethods: Object.values(paymentMethodMap).sort((a, b) => b.amount - a.amount),
    agentPerformance: Object.values(agentMap).sort((a, b) => b.bookings - a.bookings),
    bookingRows, paymentRows,
  });
}

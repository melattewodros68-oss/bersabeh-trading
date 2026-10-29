'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, fmtMoney, fmtDateTime } from '@/lib/client.js';
import { BUSINESS } from '@/lib/config.js';
import { statusLabel } from '@/lib/i18n.js';

const emptyFlight = { airline: 'Ethiopian Airlines', flightNo: '', from: '', to: '', departDate: '', departTime: '', arriveDate: '', arriveTime: '', baggage: '2x23kg', stopover: 'Direct', fareClass: 'Economy', priceTotal: '', currency: 'ETB', deadline: '', notes: '' };

export default function BookingWorkspace() {
  const { id } = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState(null);
  const [totals, setTotals] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [flight, setFlight] = useState(emptyFlight);
  const [quoteNote, setQuoteNote] = useState('');
  const [pay, setPay] = useState({ method: 'Telebirr', amount: '', currency: 'ETB', txnRef: '' });
  const [pnr, setPnr] = useState('');
  const [ticketNos, setTicketNos] = useState([]);
  const [cancelReason, setCancelReason] = useState('');
  const [msg, setMsg] = useState({ channel: 'CUSTOMER', text: '' });

  const load = useCallback(async () => {
    try {
      const d = await api(`/api/staff/bookings/${id}`);
      setBooking(d.booking); setTotals(d.totals);
      setTicketNos((d.booking.passengers || []).map(() => ''));
      setFlight(f => ({ ...f, from: d.booking.trip.from, to: d.booking.trip.to, departDate: d.booking.trip.departDate, fareClass: d.booking.trip.cabin }));
    } catch (e) { if (String(e.message).includes('log in')) router.push('/login'); else setError(e.message); }
  }, [id, router]);
  useEffect(() => { load(); }, [load]);

  async function act(action, extra = {}) {
    setError(''); setBusy(true);
    try {
      const d = await api(`/api/staff/bookings/${id}/action`, { method: 'POST', body: { action, ...extra } });
      setBooking(d.booking); setTotals(d.totals);
      if (action === 'addFlight') setFlight(f => ({ ...emptyFlight, from: f.from, to: f.to }));
      if (action === 'message') setMsg({ channel: 'CUSTOMER', text: '' });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  if (!booking) return error ? <div className="error">{error}</div> : <div className="spinner" />;
  const b = booking;
  return (
    <>
      <p className="no-print"><Link href="/staff">← Back to dashboard</Link></p>
      <div className="card" id="overview">
        <div className="flex space"><h2 style={{ border: 'none', margin: 0 }}>{b.ref}</h2><span className={`badge b-${b.status}`}>{statusLabel('en', b.status)}</span></div>
        {error && <div className="error mt">{error}</div>}
        <p className="mt"><b>{b.contact.name}</b> · 📞 {b.contact.phone} · ✉️ {b.contact.email}<br />
          <b>{b.trip.from} → {b.trip.to}</b> · {b.trip.departDate}{b.trip.type === 'return' && <> → {b.trip.returnDate}</>} · {b.trip.cabin}<br />
          <span className="muted">Assigned: {b.assignedTo || 'Unassigned'} · Created {fmtDateTime(b.createdAt)}</span></p>
        {b.trip.notes && <p className="notice mt">Customer notes: {b.trip.notes}</p>}
        {(!b.assignedTo || b.status === 'NEW') && <button className="btn btn-primary btn-sm mt" disabled={busy} onClick={() => act('assign')}>Take / assign to me</button>}
        <h3>Passengers</h3>
        <div className="table-wrap"><table><thead><tr><th>Name</th><th>Type</th><th>DOB</th><th>Gender</th><th>Nationality</th><th>Passport</th><th>Expiry</th></tr></thead>
          <tbody>{b.passengers.map(p => <tr key={p.id}><td><b>{p.fullName}</b></td><td>{p.type}</td><td>{p.dob || '-'}</td><td>{p.gender || '-'}</td><td>{p.nationality}</td><td>{p.passportNo || <i>not yet</i>}</td><td>{p.passportExpiry || '-'}</td></tr>)}</tbody></table></div>
      </div>

      <div className="card" id="flights">
        <h2>Flights & quote</h2>
        {(b.flights || []).map(f => (
          <div className="flight" key={f.id}>
            <div className="flex space"><span className="route">{f.from} → {f.to}</span><b>{fmtMoney(f.priceTotal, f.currency)}</b></div>
            <p><b>{f.airline} {f.flightNo}</b> · {f.fareClass} · {f.stopover} · 🛫 {f.departDate} {f.departTime} → 🛬 {f.arriveDate} {f.arriveTime} · 🧳 {f.baggage}{f.deadline && <> · Ticket by {f.deadline}</>}</p>
            {f.notes && <p className="muted">{f.notes}</p>}
            {['UNDER_REVIEW', 'QUOTED'].includes(b.status) && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act('deleteFlight', { flightId: f.id })}>Remove flight</button>}
          </div>
        ))}
        {totals && Object.entries(totals.byCurrency).map(([c, v]) => (
          <p key={c}><b>{c}:</b> Quoted {fmtMoney(v.quoted, c)} · Paid {fmtMoney(v.paid, c)} · <b>Balance {fmtMoney(v.balance, c)}</b></p>
        ))}
        {['UNDER_REVIEW', 'QUOTED'].includes(b.status) && (
          <>
            <h3>Add flight (price = TOTAL for all passengers)</h3>
            <div className="row3">
              {[['airline', 'Airline'], ['flightNo', 'Flight no. (e.g. ET308)'], ['fareClass', 'Fare class']].map(([k, label]) => (
                <div className="form-group" key={k}><label>{label}</label><input className="input" value={flight[k]} onChange={e => setFlight({ ...flight, [k]: e.target.value })} /></div>
              ))}
            </div>
            <div className="row3">
              {[['from', 'From'], ['to', 'To'], ['stopover', 'Stopover']].map(([k, label]) => (
                <div className="form-group" key={k}><label>{label}</label><input className="input" list="airports" value={flight[k]} onChange={e => setFlight({ ...flight, [k]: e.target.value })} /></div>
              ))}
            </div>
            <datalist id="airports">{BUSINESS.airports.map(a => <option key={a} value={a} />)}</datalist>
            <div className="row3">
              <div className="form-group"><label>Departure date</label><input className="input" type="date" value={flight.departDate} onChange={e => setFlight({ ...flight, departDate: e.target.value })} /></div>
              <div className="form-group"><label>Departure time</label><input className="input" type="time" value={flight.departTime} onChange={e => setFlight({ ...flight, departTime: e.target.value })} /></div>
              <div className="form-group"><label>Arrival date</label><input className="input" type="date" value={flight.arriveDate} onChange={e => setFlight({ ...flight, arriveDate: e.target.value })} /></div>
              <div className="form-group"><label>Arrival time</label><input className="input" type="time" value={flight.arriveTime} onChange={e => setFlight({ ...flight, arriveTime: e.target.value })} /></div>
              <div className="form-group"><label>Baggage</label><input className="input" value={flight.baggage} onChange={e => setFlight({ ...flight, baggage: e.target.value })} /></div>
              <div className="form-group"><label>Ticketing deadline</label><input className="input" placeholder="e.g. 05 Nov 18:00" value={flight.deadline} onChange={e => setFlight({ ...flight, deadline: e.target.value })} /></div>
            </div>
            <div className="row3">
              <div className="form-group"><label>Total price (all passengers) *</label><input className="input" type="number" min="1" step="0.01" value={flight.priceTotal} onChange={e => setFlight({ ...flight, priceTotal: e.target.value })} /></div>
              <div className="form-group"><label>Currency</label><select className="input" value={flight.currency} onChange={e => setFlight({ ...flight, currency: e.target.value })}>{BUSINESS.currencies.map(c => <option key={c}>{c}</option>)}</select></div>
              <div className="form-group"><label>Notes to customer</label><input className="input" value={flight.notes} onChange={e => setFlight({ ...flight, notes: e.target.value })} /></div>
            </div>
            <button className="btn btn-primary" disabled={busy} onClick={() => act('addFlight', { flight })}>Add flight</button>
          </>
        )}
        {b.status === 'UNDER_REVIEW' && (
          <div className="mt">
            <div className="form-group"><label>Quote note to customer (optional)</label><input className="input" value={quoteNote} onChange={e => setQuoteNote(e.target.value)} /></div>
            <button className="btn btn-success" disabled={busy} onClick={() => act('sendQuote', { note: quoteNote })}>📨 Send quote to customer</button>
          </div>
        )}
      </div>

      <div className="card" id="payments">
        <h2>Payments</h2>
        {(b.payments || []).length === 0 && <p className="muted">No payments yet.</p>}
        {(b.payments || []).map(p => (
          <div className="list-item" key={p.id}>
            <div className="flex space"><span><b>{fmtMoney(p.amount, p.currency)}</b> · {p.method} · Ref: {p.ref || '-'}<br /><span className="muted small">{fmtDateTime(p.at)} · {p.note}</span></span>
              <span className={`badge b-${p.status === 'CONFIRMED' ? 'CONFIRMED' : p.status}`}>{p.status}</span></div>
            {p.status === 'CLAIMED' && <div className="flex mt">
              <button className="btn btn-success btn-sm" disabled={busy} onClick={() => act('confirmPayment', { paymentId: p.id })}>✓ Verify & confirm</button>
              <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => act('rejectPayment', { paymentId: p.id })}>Reject</button></div>}
          </div>
        ))}
        {['AWAITING_PAYMENT', 'CONFIRMED'].includes(b.status) && (
          <>
            <h3>Record verified payment (cash/bank/agent-verified)</h3>
            <div className="row3">
              <div className="form-group"><label>Method</label><select className="input" value={pay.method} onChange={e => setPay({ ...pay, method: e.target.value })}>{BUSINESS.paymentMethods.map(m => <option key={m}>{m}</option>)}</select></div>
              <div className="form-group"><label>Amount</label><input className="input" type="number" min="1" step="0.01" value={pay.amount} onChange={e => setPay({ ...pay, amount: e.target.value })} /></div>
              <div className="form-group"><label>Currency</label><select className="input" value={pay.currency} onChange={e => setPay({ ...pay, currency: e.target.value })}>{BUSINESS.currencies.map(c => <option key={c}>{c}</option>)}</select></div>
            </div>
            <div className="form-group"><label>Transaction reference</label><input className="input" value={pay.txnRef} onChange={e => setPay({ ...pay, txnRef: e.target.value })} /></div>
            <button className="btn btn-primary" disabled={busy} onClick={() => act('recordPayment', pay)}>Record payment</button>
          </>
        )}
      </div>

      {b.status === 'CONFIRMED' && (
        <div className="card">
          <h2>Issue ticket</h2>
          <p className="muted mb">Ticket in your airline/GDS portal first, then record the PNR and every passenger e-ticket number here.</p>
          <div className="form-group"><label>Airline PNR / record locator *</label><input className="input" value={pnr} onChange={e => setPnr(e.target.value.toUpperCase())} placeholder="e.g. XK7P2Q" /></div>
          {b.passengers.map((p, i) => (
            <div className="form-group" key={p.id}><label>E-ticket number — {p.fullName} *</label>
              <input className="input" value={ticketNos[i] || ''} onChange={e => setTicketNos(ns => ns.map((n, j) => (j === i ? e.target.value : n)))} placeholder="e.g. 071-2345678901" /></div>
          ))}
          <button className="btn btn-success" disabled={busy} onClick={() => act('issueTicket', { pnr, ticketNumbers: ticketNos.map(n => ({ ticketNo: n })) })}>🎫 Mark ticket issued</button>
        </div>
      )}
      {b.status === 'ISSUED' && b.ticket && (
        <div className="card"><h2>🎫 Ticket issued</h2><p>PNR: <b className="ref-big">{b.ticket.pnr}</b><br />
          {b.ticket.numbers.map((n, i) => <span key={i}>{n.passenger}: <b>{n.ticketNo}</b><br /></span>)}
          <span className="muted">By {b.ticket.issuedBy} · {fmtDateTime(b.ticket.issuedAt)}</span></p></div>
      )}

      <div className="card" id="messages">
        <h2>Messages & internal notes</h2>
        <div className="msgs">
          {(b.messages || []).map(m => (
            <div key={m.id} className={`msg ${m.channel === 'INTERNAL' ? 'internal' : m.senderRole === 'CUSTOMER' ? 'customer' : 'staff'}`}>
              <b>{m.channel === 'INTERNAL' ? '🔒 Internal · ' : ''}{m.senderEmail}:</b> {m.text}<div className="muted small">{fmtDateTime(m.at)}</div>
            </div>
          ))}
          {(b.messages || []).length === 0 && <p className="muted">No messages.</p>}
        </div>
        <div className="flex mt">
          <select className="input" style={{ maxWidth: 190 }} value={msg.channel} onChange={e => setMsg({ ...msg, channel: e.target.value })}>
            <option value="CUSTOMER">To customer</option><option value="INTERNAL">Internal note</option></select>
          <input className="input" style={{ flex: 1 }} value={msg.text} onChange={e => setMsg({ ...msg, text: e.target.value })} placeholder="Write…" />
          <button className="btn btn-primary" disabled={busy || !msg.text.trim()} onClick={() => act('message', msg)}>Send</button>
        </div>
      </div>

      {b.status !== 'CANCELLED' && (
        <div className="card">
          <h2>Cancel booking</h2>
          <div className="flex">
            <input className="input" style={{ flex: 1 }} placeholder="Reason" value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
            <button className="btn btn-danger" disabled={busy} onClick={() => { if (window.confirm('Cancel this booking?')) act('cancel', { reason: cancelReason }); }}>Cancel booking</button>
          </div>
        </div>
      )}

      <div className="card" id="audit">
        <h2>Audit trail</h2>
        {(b.audit || []).slice().reverse().map(a => (
          <p key={a.id} className="small"><span className="muted">{fmtDateTime(a.at)}</span> · <b>{a.action}</b> · {a.actor} {a.details && <>— {a.details}</>}</p>
        ))}
      </div>
    </>
  );
}

'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLang } from '@/components/Lang.jsx';
import { api, fmtMoney, fmtDateTime } from '@/lib/client.js';
import { BUSINESS } from '@/lib/config.js';
import { statusLabel } from '@/lib/i18n.js';

const FLOW = ['NEW', 'UNDER_REVIEW', 'QUOTED', 'AWAITING_PAYMENT', 'CONFIRMED', 'ISSUED'];

function TrackInner() {
  const { lang, t } = useLang();
  const params = useSearchParams();
  const [ref, setRef] = useState('');
  const [email, setEmail] = useState('');
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [claim, setClaim] = useState({ method: 'Telebirr', amount: '', currency: 'ETB', txnRef: '' });
  const [msgText, setMsgText] = useState('');

  useEffect(() => { const r = params.get('ref'); if (r) setRef(r); }, [params]);

  async function load(e) {
    if (e) e.preventDefault();
    setError(''); setBusy(true);
    try { const d = await api('/api/public/track', { method: 'POST', body: { ref, email } }); setBooking(d.booking); }
    catch (err) { setBooking(null); setError(err.message); } finally { setBusy(false); }
  }
  async function act(action, extra = {}) {
    setError(''); setBusy(true);
    try {
      const d = await api('/api/public/action', { method: 'POST', body: { ref, email, action, ...extra } });
      setBooking(d.booking); setMsgText(''); setClaim({ method: 'Telebirr', amount: '', currency: 'ETB', txnRef: '' });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  const statusIdx = booking ? FLOW.indexOf(booking.status) : -1;

  return (
    <div className="card">
      <h2>{t('track_title')}</h2>
      <form onSubmit={load} className="no-print">
        <div className="row">
          <div className="form-group"><label htmlFor="ref">{t('ref')}</label>
            <input id="ref" className="input" required placeholder="BTB-XXXXXX" value={ref} onChange={e => setRef(e.target.value.toUpperCase())} /></div>
          <div className="form-group"><label htmlFor="temail">{t('email')}</label>
            <input id="temail" className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
        </div>
        <button className="btn btn-primary" disabled={busy}>{busy ? '…' : t('track_btn')}</button>
      </form>
      {error && <div className="error mt">{error}</div>}

      {booking && (
        <div className="mt">
          <div className="flex space"><h3 style={{ margin: 0 }}>{booking.ref}</h3>
            <span className={`badge b-${booking.status}`}>{statusLabel(lang, booking.status)}</span></div>
          {booking.status !== 'CANCELLED' && (
            <div className="steps no-print">{FLOW.map((s, i) => (
              <div key={s} className={`step ${i < statusIdx ? 'done' : i === statusIdx ? 'now' : ''}`}>{i + 1}. {statusLabel(lang, s).split('—')[0]}</div>
            ))}</div>
          )}
          <p><b>{t('route')}:</b> {booking.trip.from} → {booking.trip.to}<br />
            <b>{t('depart')}:</b> {booking.trip.departDate}{booking.trip.type === 'return' && <> · <b>{t('return_date')}:</b> {booking.trip.returnDate}</>}<br />
            <b>{t('passengers')}:</b> {booking.passengers.map(p => p.fullName).join(', ')}</p>

          {booking.flights?.length > 0 && (
            <>
              <h3>{t('flight_offer')}</h3>
              {booking.flights.map(f => (
                <div className="flight" key={f.id}>
                  <div className="route">{f.from} → {f.to}</div>
                  <p><b>{f.airline} {f.flightNo}</b> · {f.fareClass} · {f.stopover}</p>
                  <p>🛫 {f.departDate} {f.departTime} → 🛬 {f.arriveDate} {f.arriveTime}</p>
                  <p>🧳 {f.baggage || '-'} {f.deadline && <>· ⏰ Ticket by: {f.deadline}</>}</p>
                  {f.notes && <p className="muted">{f.notes}</p>}
                  <p><b>{t('total_all_pax')}: {fmtMoney(f.priceTotal, f.currency)}</b></p>
                </div>
              ))}
              {Object.entries(booking.totals?.byCurrency || {}).map(([c, v]) => (
                <p key={c}><b>{c}:</b> {t('amount_due')} <b>{fmtMoney(Math.max(v.balance, 0), c)}</b> · {t('paid')} {fmtMoney(v.paid, c)} / {fmtMoney(v.quoted, c)}</p>
              ))}
            </>
          )}

          {booking.status === 'QUOTED' && (
            <div className="notice no-print">
              <div className="flex">
                <button className="btn btn-success" disabled={busy} onClick={() => act('approve')}>✓ {t('accept')}</button>
                <input className="input" style={{ maxWidth: 320 }} placeholder={t('reject_reason')} value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                <button className="btn btn-danger" disabled={busy} onClick={() => act('reject', { reason: rejectReason })}>✕ {t('reject')}</button>
              </div>
            </div>
          )}

          {(booking.status === 'AWAITING_PAYMENT' || booking.status === 'CONFIRMED') && (
            <div className="no-print">
              <h3>{t('pay_title')}</h3><p>{t('pay_body')}</p>
              <div className="table-wrap mb"><table><tbody>
                {BUSINESS.paymentAccounts.map((a, i) => <tr key={i}><td><b>{a.label}</b></td><td>{a.detail}</td></tr>)}
              </tbody></table></div>
              {booking.payments?.length > 0 && (
                <div className="table-wrap mb"><table><thead><tr><th>{t('method')}</th><th>{t('amount')}</th><th>{t('txn')}</th><th>{t('status_label')}</th></tr></thead>
                  <tbody>{booking.payments.map(p => <tr key={p.id}><td>{p.method}</td><td>{fmtMoney(p.amount, p.currency)}</td><td>{p.ref}</td>
                    <td><span className={`badge b-${p.status === 'CONFIRMED' ? 'CONFIRMED' : p.status}`}>{p.status}</span></td></tr>)}</tbody></table></div>
              )}
              <div className="row3">
                <div className="form-group"><label>{t('method')}</label>
                  <select className="input" value={claim.method} onChange={e => setClaim({ ...claim, method: e.target.value })}>
                    {BUSINESS.paymentMethods.map(m => <option key={m}>{m}</option>)}</select></div>
                <div className="form-group"><label>{t('amount')}</label>
                  <input className="input" type="number" min="1" step="0.01" value={claim.amount} onChange={e => setClaim({ ...claim, amount: e.target.value })} /></div>
                <div className="form-group"><label>Currency</label>
                  <select className="input" value={claim.currency} onChange={e => setClaim({ ...claim, currency: e.target.value })}>
                    {BUSINESS.currencies.map(c => <option key={c}>{c}</option>)}</select></div>
              </div>
              <div className="form-group"><label>{t('txn')}</label>
                <input className="input" value={claim.txnRef} onChange={e => setClaim({ ...claim, txnRef: e.target.value })} /></div>
              <button className="btn btn-primary" disabled={busy} onClick={() => act('claimPayment', claim)}>{t('claim_btn')}</button>
            </div>
          )}

          {booking.status === 'ISSUED' && booking.ticket && (
            <div style={{ border: '2px solid var(--secondary)', borderRadius: 10, padding: '1.2rem', marginTop: '1rem' }}>
              <h3 style={{ marginTop: 0 }}>🎫 {t('ticket_title')}</h3>
              <p><b>{t('pnr')}:</b> <span className="ref-big">{booking.ticket.pnr}</span></p>
              <div className="table-wrap"><table><thead><tr><th>Passenger</th><th>{t('ticket_no')}</th></tr></thead>
                <tbody>{booking.ticket.numbers.map((n, i) => <tr key={i}><td>{n.passenger}</td><td><b>{n.ticketNo}</b></td></tr>)}</tbody></table></div>
              <p className="muted mt">{fmtDateTime(booking.ticket.issuedAt)} · {BUSINESS.name}</p>
              <button className="btn btn-outline btn-sm no-print" onClick={() => window.print()}>🖨 {t('print')}</button>
            </div>
          )}

          <h3 className="no-print">{t('messages')}</h3>
          <div className="msgs no-print">
            {(booking.messages || []).length === 0 && <p className="muted">—</p>}
            {(booking.messages || []).map(m => (
              <div key={m.id} className={`msg ${m.senderRole === 'CUSTOMER' ? 'customer' : 'staff'}`}>
                <b>{m.senderRole === 'CUSTOMER' ? 'You' : BUSINESS.name}:</b> {m.text}
                <div className="muted small">{fmtDateTime(m.at)}</div>
              </div>
            ))}
          </div>
          {booking.status !== 'CANCELLED' && (
            <div className="flex mt no-print">
              <input className="input" style={{ flex: 1 }} placeholder={t('write_msg')} value={msgText} onChange={e => setMsgText(e.target.value)} />
              <button className="btn btn-primary" disabled={busy || !msgText.trim()} onClick={() => act('message', { text: msgText })}>{t('send')}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TrackPage() {
  return <Suspense fallback={<div className="spinner" />}><TrackInner /></Suspense>;
}

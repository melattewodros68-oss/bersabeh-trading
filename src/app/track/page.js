'use client';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLang } from '@/components/Lang.jsx';
import { api, fmtMoney, fmtDateTime, PAGE_REFRESH_EVENT } from '@/lib/client.js';
import { BUSINESS } from '@/lib/config.js';
import { statusLabel } from '@/lib/i18n.js';

const FLOW = ['NEW', 'UNDER_REVIEW', 'QUOTED', 'AWAITING_PAYMENT', 'CONFIRMED', 'ISSUED'];
const accountNumber = (detail = '') => {
  const match = String(detail).match(/\d[\d\s-]{5,}\d/);
  return match ? match[0].replace(/[\s-]/g, '') : String(detail).replace(/^[^:]+:\s*/, '');
};

function TrackInner() {
  const { lang, t } = useLang();
  const params = useSearchParams();
  const [ref, setRef] = useState('');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastChecked, setLastChecked] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [claim, setClaim] = useState({ method: 'Telebirr', amount: '', currency: 'ETB', txnRef: '' });
  const [msgText, setMsgText] = useState('');

  const fetchBooking = useCallback(async ({ accessToken = '', bookingRef = '', bookingEmail = '', silent = false } = {}) => {
    if (!silent) { setBusy(true); setError(''); }
    try {
      const d = await api('/api/public/track', { method: 'POST', body: { ref: bookingRef, email: bookingEmail, token: accessToken } });
      setBooking(d.booking);
      setRef(d.booking.ref || bookingRef);
      setEmail(d.booking.contact?.email || bookingEmail);
      const nextToken = d.accessToken || accessToken;
      if (nextToken) {
        setToken(nextToken);
        try {
          localStorage.setItem(`bersabeh_booking_${d.booking.ref}`, nextToken);
          window.history.replaceState(null, '', `/track?t=${encodeURIComponent(nextToken)}`);
        } catch {}
      }
      setLastChecked(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      if (silent) setError('');
      return d.booking;
    } catch (err) {
      setError(err.message);
      if (!silent) setBooking(null);
      return null;
    } finally {
      if (!silent) setBusy(false);
    }
  }, []);

  // Private live link: /track?t=... opens the booking directly.
  // A saved browser token also makes an old /track?ref=... link open it.
  useEffect(() => {
    const urlToken = params.get('t');
    const urlRef = params.get('ref');
    if (urlRef) setRef(urlRef.toUpperCase());
    if (urlToken) {
      setToken(urlToken);
      fetchBooking({ accessToken: urlToken });
    } else if (urlRef) {
      try {
        const saved = localStorage.getItem(`bersabeh_booking_${urlRef.toUpperCase()}`);
        if (saved) { setToken(saved); fetchBooking({ accessToken: saved }); }
      } catch {}
    }
  }, [params, fetchBooking]);

  const load = useCallback(async (e) => {
    if (e) e.preventDefault();
    return fetchBooking({ bookingRef: ref, bookingEmail: email });
  }, [fetchBooking, ref, email]);

  // Global Refresh: reload this booking in place (typed message/payment
  // fields stay); with a half-typed form, stay put instead of reloading.
  useEffect(() => {
    const onRefresh = (e) => {
      if (booking && token) { e.detail.handled = true; e.detail.done = fetchBooking({ accessToken: token }); }
      else if (booking && ref && email) { e.detail.handled = true; e.detail.done = load(); }
      else if (ref || email) { e.detail.handled = true; e.detail.done = Promise.resolve(); }
    };
    window.addEventListener(PAGE_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(PAGE_REFRESH_EVENT, onRefresh);
  }, [booking, token, ref, email, fetchBooking, load]);

  // Live updates while the office is working on the booking.
  const bookingStatus = booking?.status;
  useEffect(() => {
    if (!booking || !token || ['ISSUED', 'CANCELLED'].includes(bookingStatus)) return;
    const id = setInterval(() => fetchBooking({ accessToken: token, silent: true }), 30000);
    return () => clearInterval(id);
  }, [booking, bookingStatus, token, fetchBooking]);

  // Pre-fill the exact amount due so the customer does not type it again.
  useEffect(() => {
    if (!booking || booking.status !== 'AWAITING_PAYMENT') return;
    const entry = Object.entries(booking.totals?.byCurrency || {}).find(([, v]) => v.balance > 0);
    if (entry) setClaim(c => (c.amount ? c : { ...c, amount: String(entry[1].balance), currency: entry[0] }));
  }, [booking]);

  async function copyText(key, text) {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 1800);
  }
  async function shareText(key, title, text, url) {
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); return; } catch { return; }
    }
    await copyText(key, url || text);
  }

  async function act(action, extra = {}) {
    setError(''); setBusy(true);
    try {
      const d = await api('/api/public/action', { method: 'POST', body: { ref, email, token, action, ...extra } });
      setBooking(d.booking); setMsgText(''); setClaim({ method: 'Telebirr', amount: '', currency: 'ETB', txnRef: '' });
      setLastChecked(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  const statusIdx = booking ? FLOW.indexOf(booking.status) : -1;
  const liveLink = token ? `${window.location.origin}/track?t=${encodeURIComponent(token)}` : '';
  const hasClaim = booking?.payments?.some(p => p.status === 'CLAIMED');
  const balances = Object.entries(booking?.totals?.byCurrency || {}).filter(([, v]) => v.quoted > 0);
  const reasons = booking?.approvalCheck?.reasons || [];
  const nextStep = !booking ? '' :
    booking.status === 'CANCELLED' ? t('cancelled_step') :
    ['NEW', 'UNDER_REVIEW'].includes(booking.status) ? t('wait_agent') :
    booking.status === 'QUOTED' ? (booking.authorization?.mode === 'PREAPPROVED' && reasons.length
      ? `${t('quote_differs')} ${lang === 'en' ? reasons.join('; ') : ''}`
      : t('review_quote')) :
    booking.status === 'AWAITING_PAYMENT' ? (hasClaim ? t('wait_payment_review') : t('pay_now_step')) :
    booking.status === 'CONFIRMED' ? t('waiting_ticket') :
    booking.status === 'ISSUED' ? t('ticket_ready_step') : '';
  const ticketText = booking?.ticket ? `${BUSINESS.name} e-ticket\nBooking: ${booking.ref}\nPNR: ${booking.ticket.pnr}\n${(booking.ticket.numbers || []).map(n => `${n.passenger}: ${n.ticketNo}`).join('\n')}` : '';

  return (
    <div className="card">
      <h2>{t('track_title')}</h2>
      {!booking && (
        <>
          <p className="muted">{t('track_help')}</p>
          {busy && <div className="notice mt">{t('loading_link')}</div>}
          <form onSubmit={load} className="no-print">
            <div className="row">
              <div className="form-group"><label htmlFor="ref">{t('ref')}</label>
                <input id="ref" className="input" required placeholder="BTB-XXXXXX" value={ref} onChange={e => setRef(e.target.value.toUpperCase())} /></div>
              <div className="form-group"><label htmlFor="temail">{t('email')}</label>
                <input id="temail" className="input" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : t('track_btn')}</button>
          </form>
        </>
      )}
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

          <div className="next-step no-print">
            <b>➡️ {t('next_step')}</b>
            <p>{nextStep}</p>
            {booking.autoApprovedAt && <p className="success-text">{t('auto_approved')}</p>}
          </div>

          {liveLink && (
            <div className="live-box no-print">
              <b>🔖 {t('save_page')}</b>
              <p className="muted small">{t('auto_updates')}{lastChecked && <> · {t('last_checked')}: {lastChecked}</>}</p>
              <p className="warn small">{t('private_link_warn')}</p>
              <div className="flex">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => copyText('link', liveLink)}>{copiedKey === 'link' ? t('copied') : `🔗 ${t('copy_link')}`}</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => shareText('link', `${BUSINESS.name} booking ${booking.ref}`, `${BUSINESS.name} booking ${booking.ref}`, liveLink)}>📤 {t('share_link')}</button>
                <a className="btn btn-outline btn-sm" href={`https://wa.me/?text=${encodeURIComponent(`${BUSINESS.name} booking ${booking.ref}: ${liveLink}`)}`} target="_blank" rel="noreferrer">WhatsApp {t('whatsapp_me')}</a>
              </div>
            </div>
          )}

          <p><b>{t('route')}:</b> {booking.trip.from} → {booking.trip.to}<br />
            <b>{t('depart')}:</b> {booking.trip.departDate}{booking.trip.type === 'return' && <> · <b>{t('return_date')}:</b> {booking.trip.returnDate}</>}<br />
            <b>{t('passengers')}:</b> {booking.passengers.map(p => p.fullName).join(', ')}</p>
          {booking.authorization?.mode === 'PREAPPROVED' && (
            <p className="notice">⚡ <b>{t('approval_given')}:</b> {t('up_to')} {fmtMoney(booking.authorization.maxTotal, booking.authorization.currency)}
              {booking.authorization.directOnly ? ' · Direct only' : ''}{Number(booking.authorization.dateFlexibilityDays) > 0 ? ` · ±${booking.authorization.dateFlexibilityDays} day(s)` : ''}</p>
          )}

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
              {balances.map(([c, v]) => (
                <p key={c}><b>{c}:</b> {t('amount_due')} <b>{fmtMoney(Math.max(v.balance, 0), c)}</b> · {t('paid')} {fmtMoney(v.paid, c)} / {fmtMoney(v.quoted, c)}</p>
              ))}
            </>
          )}

          {booking.status === 'QUOTED' && (
            <div className="notice no-print">
              {reasons.length > 0 && booking.authorization?.mode === 'PREAPPROVED' && (
                <ul className="reason-list">{reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
              )}
              <div className="flex">
                <button type="button" className="btn btn-success" disabled={busy} onClick={() => act('approve')}>✓ {t('accept')}</button>
                <input className="input" style={{ maxWidth: 320 }} placeholder={t('reject_reason')} value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                <button type="button" className="btn btn-danger" disabled={busy} onClick={() => act('reject', { reason: rejectReason })}>✕ {t('reject')}</button>
              </div>
            </div>
          )}

          {booking.status === 'AWAITING_PAYMENT' && (
            <div className="no-print">
              <h3>{t('pay_title')}</h3><p>{t('pay_body')}</p>
              <div className="due-grid">
                {balances.filter(([, v]) => v.balance > 0).map(([c, v]) => (
                  <div className="due-card" key={c}>
                    <span>{t('pay_exact')}</span>
                    <b>{fmtMoney(v.balance, c)}</b>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => copyText(`amount-${c}`, String(v.balance))}>{copiedKey === `amount-${c}` ? t('copied') : `📋 ${t('copy_amount')}`}</button>
                  </div>
                ))}
              </div>
              <p>{t('choose_account')}</p>
              <div className="account-grid mb">
                {BUSINESS.paymentAccounts.map((a, i) => (
                  <div className="account-card" key={i}>
                    <b>{a.label}</b>
                    <span>{a.detail}</span>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => copyText(`account-${i}`, accountNumber(a.detail))}>{copiedKey === `account-${i}` ? t('copied') : `📋 ${t('copy_account')}`}</button>
                  </div>
                ))}
              </div>
              {booking.payments?.length > 0 && (
                <div className="table-wrap mb"><table><thead><tr><th>{t('method')}</th><th>{t('amount')}</th><th>{t('txn')}</th><th>{t('status_label')}</th></tr></thead>
                  <tbody>{booking.payments.map(p => <tr key={p.id}><td>{p.method}</td><td>{fmtMoney(p.amount, p.currency)}</td><td>{p.ref}</td>
                    <td><span className={`badge b-${p.status === 'CONFIRMED' ? 'CONFIRMED' : p.status}`}>{p.status}</span></td></tr>)}</tbody></table></div>
              )}
              {hasClaim ? (
                <div className="notice">⏳ {t('wait_payment_review')}</div>
              ) : (
                <>
                  <div className="row3">
                    <div className="form-group"><label>{t('method')}</label>
                      <select className="input" value={claim.method} onChange={e => setClaim({ ...claim, method: e.target.value })}>
                        {BUSINESS.paymentMethods.map(m => <option key={m}>{m}</option>)}</select></div>
                    <div className="form-group"><label>{t('amount')}</label>
                      <input className="input" type="number" min="1" step="0.01" value={claim.amount} onChange={e => setClaim({ ...claim, amount: e.target.value })} /></div>
                    <div className="form-group"><label>{t('currency')}</label>
                      <select className="input" value={claim.currency} onChange={e => setClaim({ ...claim, currency: e.target.value })}>
                        {BUSINESS.currencies.map(c => <option key={c}>{c}</option>)}</select></div>
                  </div>
                  <div className="form-group"><label>{t('txn')}</label>
                    <input className="input" value={claim.txnRef} onChange={e => setClaim({ ...claim, txnRef: e.target.value })} /></div>
                  <button type="button" className="btn btn-primary" disabled={busy || !claim.amount || !claim.txnRef.trim()} onClick={() => act('claimPayment', claim)}>{t('claim_btn')}</button>
                </>
              )}
            </div>
          )}

          {booking.status === 'ISSUED' && booking.ticket && (
            <div style={{ border: '2px solid var(--secondary)', borderRadius: 10, padding: '1.2rem', marginTop: '1rem' }}>
              <h3 style={{ marginTop: 0 }}>🎫 {t('ticket_title')}</h3>
              <p><b>{t('pnr')}:</b> <span className="ref-big">{booking.ticket.pnr}</span></p>
              <div className="table-wrap"><table><thead><tr><th>Passenger</th><th>{t('ticket_no')}</th></tr></thead>
                <tbody>{booking.ticket.numbers.map((n, i) => <tr key={i}><td>{n.passenger}</td><td><b>{n.ticketNo}</b></td></tr>)}</tbody></table></div>
              <p className="muted mt">{fmtDateTime(booking.ticket.issuedAt)} · {BUSINESS.name}</p>
              <div className="flex no-print">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => window.print()}>🖨 {t('print')}</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => copyText('ticket', ticketText)}>{copiedKey === 'ticket' ? t('copied') : `📋 ${t('copy_ticket')}`}</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => shareText('ticket', `${BUSINESS.name} e-ticket`, ticketText, liveLink)}>📤 {t('share_ticket')}</button>
                <a className="btn btn-outline btn-sm" href={`https://wa.me/?text=${encodeURIComponent(ticketText)}`} target="_blank" rel="noreferrer">WhatsApp</a>
              </div>
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
              <button type="button" className="btn btn-primary" disabled={busy || !msgText.trim()} onClick={() => act('message', { text: msgText })}>{t('send')}</button>
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

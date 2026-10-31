'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLang } from '@/components/Lang.jsx';
import { api, PAGE_REFRESH_EVENT } from '@/lib/client.js';
import { BUSINESS } from '@/lib/config.js';

const emptyPax = () => ({ fullName: '', dob: '', gender: 'Female', nationality: 'Ethiopian', passportNo: '', passportExpiry: '', type: 'ADULT' });

export default function HomePage() {
  const { lang, t } = useLang();
  const today = new Date().toISOString().slice(0, 10);
  const [contact, setContact] = useState({ name: '', phone: '', email: '' });
  const [trip, setTrip] = useState({ type: 'return', from: 'ADD — Addis Ababa Bole (ADD)', to: '', departDate: '', returnDate: '', cabin: 'Economy', notes: '' });
  const [passengers, setPassengers] = useState([emptyPax()]);
  const [authorization, setAuthorization] = useState({ mode: 'ASK', maxTotal: '', currency: 'ETB', dateFlexibilityDays: 0, directOnly: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ref, setRef] = useState('');
  const [token, setToken] = useState('');

  const setPax = (i, key, value) => setPassengers(ps => ps.map((p, j) => (j === i ? { ...p, [key]: value } : p)));

  // Refresh protection: never wipe the success screen's booking
  // reference, and ask before clearing a half-filled request form.
  const formDirty = Boolean(
    contact.name || contact.phone || contact.email
    || trip.to || trip.departDate || trip.returnDate || trip.notes
    || trip.type !== 'return' || trip.from !== 'ADD — Addis Ababa Bole (ADD)' || trip.cabin !== 'Economy'
    || passengers.length !== 1
    || passengers.some(p => p.fullName || p.dob || p.passportNo || p.passportExpiry
      || p.type !== 'ADULT' || p.gender !== 'Female' || p.nationality !== 'Ethiopian')
    || authorization.mode !== 'ASK' || authorization.maxTotal || authorization.directOnly
    || Number(authorization.dateFlexibilityDays) !== 0 || authorization.currency !== 'ETB'
  );
  useEffect(() => {
    const onRefresh = (e) => {
      if (ref) { e.detail.handled = true; e.detail.done = Promise.resolve(); return; }
      if (formDirty && !window.confirm('Refresh this page? Details you have typed but not sent will be cleared.')) {
        e.detail.handled = true; e.detail.done = Promise.resolve();
      }
    };
    window.addEventListener(PAGE_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(PAGE_REFRESH_EVENT, onRefresh);
  }, [ref, formDirty]);

  async function submit(e) {
    e.preventDefault(); setError('');
    if (authorization.mode === 'PREAPPROVED' && !(Number(authorization.maxTotal) > 0)) { setError(t('max_required')); return; }
    setBusy(true);
    try {
      const data = await api('/api/public/bookings', { method: 'POST', body: { contact, trip, passengers, authorization, language: lang } });
      setRef(data.ref);
      setToken(data.accessToken || '');
      try { if (data.accessToken) localStorage.setItem(`bersabeh_booking_${data.ref}`, data.accessToken); } catch {}
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  if (ref) return (
    <div className="card">
      <div className="success"><h2 style={{ border: 'none', margin: 0, color: 'inherit' }}>✅ {t('success_title')}</h2></div>
      <p>{t('success_body')}</p>
      <p className="mt">{t('your_ref')}:<br /><span className="ref-big">{ref}</span></p>
      <p className="warn">{t('save_link_hint')}</p>
      <div className="flex mt">
        <Link className="btn btn-primary" href={token ? `/track?t=${encodeURIComponent(token)}` : `/track?ref=${encodeURIComponent(ref)}`}>{t('track_now')}</Link>
        <button type="button" className="btn btn-outline" onClick={() => { setRef(''); setToken(''); }}>{t('new_request')}</button>
      </div>
    </div>
  );

  return (
    <>
      <section className="hero">
        <div className="hero-grid">
          <div>
            <span className="kicker">🇪🇹 {t('hero_kicker')}</span>
            <h1>{t('hero_title')}</h1>
            <p>{t('hero_sub')}</p>
            <div className="trust-row">
              <span className="trust-chip">{t('chip1')}</span>
              <span className="trust-chip">{t('chip2')}</span>
              <span className="trust-chip">{t('chip3')}</span>
            </div>
          </div>
          <div className="hero-img-wrap">
            <img className="hero-img" src="/hero-et.jpg" alt="Ethiopian Airlines style airplane with green, gold and red tail taking off over Addis Ababa" />
            <img className="hero-flag-badge" src="/logo-wing.png" alt="Ethiopian-inspired green, gold and red wing emblem" />
          </div>
        </div>
      </section>

      <section className="how">
        <h2 className="section-title">{t('how_title')}</h2>
        <div className="how-grid">
          <div className="how-card"><div className="how-num">1</div><b>{t('s1t')}</b><p className="muted">{t('s1d')}</p></div>
          <div className="how-card"><div className="how-num">2</div><b>{t('s2t')}</b><p className="muted">{t('s2d')}</p></div>
          <div className="how-card"><div className="how-num">3</div><b>{t('s3t')}</b><p className="muted">{t('s3d')}</p></div>
          <div className="how-card"><div className="how-num">4</div><b>{t('s4t')}</b><p className="muted">{t('s4d')}</p></div>
        </div>
      </section>

      <p className="muted" style={{ fontWeight: 700 }}>{t('popular')}</p>
      <div className="dest-chips">
        {['DXB — Dubai (DXB)', 'IST — Istanbul (IST)', 'DOH — Doha (DOH)', 'LHR — London Heathrow (LHR)', 'JED — Jeddah (JED)', 'NBO — Nairobi (NBO)'].map(d => (
          <button key={d} type="button" className="chip" onClick={() => { setTrip(tr => ({ ...tr, to: d })); document.getElementById('book-form')?.scrollIntoView({ behavior: 'smooth' }); }}>✈️ {d}</button>
        ))}
      </div>

      <form className="card" id="book-form" onSubmit={submit}>
        <h2><span className="step-no">1</span>{t('contact')}</h2>
        {error && <div className="error">{error}</div>}
        <div className="row3">
          <div className="form-group"><label htmlFor="cname">{t('full_name')} *</label>
            <input id="cname" className="input" required value={contact.name} onChange={e => setContact({ ...contact, name: e.target.value })} /></div>
          <div className="form-group"><label htmlFor="cphone">{t('phone')} *</label>
            <input id="cphone" className="input" type="tel" required placeholder="+2519..." value={contact.phone} onChange={e => setContact({ ...contact, phone: e.target.value })} /></div>
          <div className="form-group"><label htmlFor="cemail">{t('email')} *</label>
            <input id="cemail" className="input" type="email" required value={contact.email} onChange={e => setContact({ ...contact, email: e.target.value })} /></div>
        </div>

        <h2><span className="step-no">2</span>{t('trip')}</h2>
        <datalist id="airports">{BUSINESS.airports.map(a => <option key={a} value={a} />)}</datalist>
        <div className="row3">
          <div className="form-group"><label>{t('trip_type')}</label>
            <select className="input" value={trip.type} onChange={e => setTrip({ ...trip, type: e.target.value })}>
              <option value="oneway">{t('oneway')}</option><option value="return">{t('ret')}</option></select></div>
          <div className="form-group"><label htmlFor="from">{t('from')} *</label>
            <input id="from" className="input" list="airports" required value={trip.from} onChange={e => setTrip({ ...trip, from: e.target.value })} /></div>
          <div className="form-group"><label htmlFor="to">{t('to')} *</label>
            <input id="to" className="input" list="airports" required placeholder="Dubai (DXB)" value={trip.to} onChange={e => setTrip({ ...trip, to: e.target.value })} /></div>
        </div>
        <div className="row3">
          <div className="form-group"><label htmlFor="dep">{t('depart')} *</label>
            <input id="dep" className="input" type="date" min={today} required value={trip.departDate} onChange={e => setTrip({ ...trip, departDate: e.target.value })} /></div>
          {trip.type === 'return' && (
            <div className="form-group"><label htmlFor="ret">{t('return_date')} *</label>
              <input id="ret" className="input" type="date" min={trip.departDate || today} required value={trip.returnDate} onChange={e => setTrip({ ...trip, returnDate: e.target.value })} /></div>
          )}
          <div className="form-group"><label>{t('cabin')}</label>
            <select className="input" value={trip.cabin} onChange={e => setTrip({ ...trip, cabin: e.target.value })}>
              <option value="Economy">{t('economy')}</option><option value="Business">{t('business')}</option><option value="First">{t('first')}</option></select></div>
        </div>

        <h2><span className="step-no">3</span>{t('passengers')} ({passengers.length})</h2>
        {passengers.map((p, i) => (
          <div key={i} style={{ border: '1px solid var(--gray-200)', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
            <div className="flex space"><b>#{i + 1}</b>
              {passengers.length > 1 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPassengers(ps => ps.filter((_, j) => j !== i))}>{t('remove')}</button>}
            </div>
            <div className="row3 mt">
              <div className="form-group"><label>{t('pax_name')} *</label>
                <input className="input" required value={p.fullName} onChange={e => setPax(i, 'fullName', e.target.value)} /></div>
              <div className="form-group"><label>{t('pax_type')}</label>
                <select className="input" value={p.type} onChange={e => setPax(i, 'type', e.target.value)}>
                  <option value="ADULT">{t('adult')}</option><option value="CHILD">{t('child')}</option><option value="INFANT">{t('infant')}</option></select></div>
              <div className="form-group"><label>{t('dob')}</label>
                <input className="input" type="date" max={today} value={p.dob} onChange={e => setPax(i, 'dob', e.target.value)} /></div>
            </div>
            <div className="row3">
              <div className="form-group"><label>{t('gender')}</label>
                <select className="input" value={p.gender} onChange={e => setPax(i, 'gender', e.target.value)}>
                  <option value="Female">{t('female')}</option><option value="Male">{t('male')}</option></select></div>
              <div className="form-group"><label>{t('nationality')}</label>
                <input className="input" value={p.nationality} onChange={e => setPax(i, 'nationality', e.target.value)} /></div>
              <div className="form-group"><label>{t('passport')}</label>
                <input className="input" value={p.passportNo} onChange={e => setPax(i, 'passportNo', e.target.value.toUpperCase())} /></div>
            </div>
            <div className="form-group"><label>{t('passport_expiry')}</label>
              <input className="input" type="date" value={p.passportExpiry} onChange={e => setPax(i, 'passportExpiry', e.target.value)} /></div>
          </div>
        ))}
        {passengers.length < 9 && <button type="button" className="btn btn-outline btn-sm" onClick={() => setPassengers(ps => [...ps, emptyPax()])}>{t('add_passenger')}</button>}

        <h2><span className="step-no">4</span>{t('fast_track')}</h2>
        <p className="muted">{t('approve_body')}</p>
        <div className="approval-options">
          <label className="approval-option">
            <input type="radio" name="approval-mode" checked={authorization.mode === 'ASK'} onChange={() => setAuthorization(a => ({ ...a, mode: 'ASK' }))} />
            <span>{t('ask_me_first')}</span>
          </label>
          <label className="approval-option">
            <input type="radio" name="approval-mode" checked={authorization.mode === 'PREAPPROVED'} onChange={() => setAuthorization(a => ({ ...a, mode: 'PREAPPROVED' }))} />
            <span>{t('approve_now')}</span>
          </label>
        </div>
        {authorization.mode === 'PREAPPROVED' && (
          <div className="approval-box">
            <div className="row3">
              <div className="form-group"><label htmlFor="max-total">{t('max_total')} *</label>
                <input id="max-total" className="input" type="number" min="1" step="0.01" inputMode="decimal" placeholder="e.g. 45000"
                  value={authorization.maxTotal} onChange={e => setAuthorization(a => ({ ...a, maxTotal: e.target.value }))} /></div>
              <div className="form-group"><label>{t('currency')}</label>
                <select className="input" value={authorization.currency} onChange={e => setAuthorization(a => ({ ...a, currency: e.target.value }))}>
                  {BUSINESS.currencies.map(c => <option key={c} value={c}>{c}</option>)}
                </select></div>
              <div className="form-group"><label>{t('date_flex')}</label>
                <select className="input" value={authorization.dateFlexibilityDays} onChange={e => setAuthorization(a => ({ ...a, dateFlexibilityDays: Number(e.target.value) }))}>
                  <option value={0}>{t('exact_dates')}</option><option value={1}>{t('plus_minus_1')}</option><option value={3}>{t('plus_minus_3')}</option>
                </select></div>
            </div>
            <label className="check-row"><input type="checkbox" checked={authorization.directOnly} onChange={e => setAuthorization(a => ({ ...a, directOnly: e.target.checked }))} /> {t('direct_only')}</label>
            <p className="warn">{t('approve_warn')}</p>
          </div>
        )}

        <div className="form-group mt"><label htmlFor="notes">{t('notes')}</label>
          <textarea id="notes" className="input" rows={3} placeholder={t('notes_ph')} value={trip.notes} onChange={e => setTrip({ ...trip, notes: e.target.value })} /></div>
        <p className="muted mb">{t('privacy')}</p>
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? t('sending') : t('submit')}</button>
      </form>
    </>
  );
}

'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client.js';
import { statusLabel } from '@/lib/i18n.js';

const STATUSES = ['', 'NEW', 'UNDER_REVIEW', 'QUOTED', 'AWAITING_PAYMENT', 'CONFIRMED', 'ISSUED', 'CANCELLED'];

export default function StaffPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [counts, setCounts] = useState({});
  const [scope, setScope] = useState('new');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwMsg, setPwMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await api(`/api/staff/bookings?scope=${scope}&q=${encodeURIComponent(q)}&status=${status}`);
      setBookings(d.bookings); setCounts(d.counts);
    } catch (e) { setError(e.message); }
  }, [scope, q, status]);

  useEffect(() => {
    api('/api/auth/me').then(d => setMe(d.user)).catch(() => router.push('/login'));
  }, [router]);
  useEffect(() => { if (me) load(); }, [me, load]);

  async function take(id) {
    try { await api(`/api/staff/bookings/${id}/action`, { method: 'POST', body: { action: 'assign' } }); setScope('mine'); }
    catch (e) { setError(e.message); }
  }
  async function changePassword(e) {
    e.preventDefault(); setPwMsg('');
    try { await api('/api/auth/change-password', { method: 'POST', body: pw }); setPwMsg('✅ Password changed.'); setPw({ currentPassword: '', newPassword: '' }); setMe(m => ({ ...m, mustChangePassword: false })); }
    catch (err) { setPwMsg('❌ ' + err.message); }
  }

  if (!me) return <div className="spinner" />;
  return (
    <>
      <div className="flex space"><h1 style={{ fontSize: '1.5rem' }}>Staff dashboard</h1><span className="muted">{me.fullName} · {me.role}</span></div>
      {me.mustChangePassword && <div className="error mt">⚠️ You are using a temporary/demo password. Change it now using the form below.</div>}
      {error && <div className="error mt">{error}</div>}
      <div className="grid mt">
        <div className="stat"><div className="v">{counts.new ?? 0}</div><div className="l">New unassigned requests</div></div>
        <div className="stat"><div className="v">{counts.mine ?? 0}</div><div className="l">My active bookings</div></div>
        <div className="stat"><div className="v">{counts.completed ?? 0}</div><div className="l">My issued tickets</div></div>
      </div>
      <div className="card">
        <div className="tabs">
          {[['new', 'New requests'], ['mine', 'Mine'], ...(me.role === 'ADMIN' ? [['all', 'All bookings']] : [])].map(([s, label]) => (
            <button key={s} className={`tab ${scope === s ? 'active' : ''}`} onClick={() => setScope(s)}>{label}</button>
          ))}
        </div>
        <div className="row">
          <div className="form-group"><label>Search</label>
            <input className="input" placeholder="Reference, name, phone, route…" value={q} onChange={e => setQ(e.target.value)} /></div>
          <div className="form-group"><label>Status</label>
            <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s ? statusLabel('en', s) : 'All statuses'}</option>)}</select></div>
        </div>
        {bookings.length === 0 && <p className="muted">No bookings in this view.</p>}
        {bookings.map(b => (
          <div className="list-item" key={b.id}>
            <div className="flex space">
              <span><b>{b.ref}</b> · {b.name} · {b.from} → {b.to}<br />
                <span className="muted small">{b.departDate} · {b.passengers} pax · {b.phone} · {b.assignedTo || 'Unassigned'}</span></span>
              <span className={`badge b-${b.status}`}>{statusLabel('en', b.status)}</span>
            </div>
            <div className="flex mt">
              <Link className="btn btn-outline btn-sm" href={`/staff/bookings/${b.id}`}>Open workspace</Link>
              {b.status === 'NEW' && !b.assignedTo && <button className="btn btn-primary btn-sm" onClick={() => take(b.id)}>Take request</button>}
            </div>
          </div>
        ))}
      </div>
      <form className="card" onSubmit={changePassword}>
        <h2>Change my password</h2>
        {pwMsg && <p className="mb">{pwMsg}</p>}
        <div className="row">
          <div className="form-group"><label>Current password</label>
            <input className="input" type="password" required value={pw.currentPassword} onChange={e => setPw({ ...pw, currentPassword: e.target.value })} /></div>
          <div className="form-group"><label>New password (min 10 characters)</label>
            <input className="input" type="password" required minLength={10} value={pw.newPassword} onChange={e => setPw({ ...pw, newPassword: e.target.value })} /></div>
        </div>
        <button className="btn btn-primary btn-sm">Change password</button>
      </form>
    </>
  );
}

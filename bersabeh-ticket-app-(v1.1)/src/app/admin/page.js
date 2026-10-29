'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, fmtMoney, fmtDateTime } from '@/lib/client.js';
import { statusLabel } from '@/lib/i18n.js';

export default function AdminPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'AGENT', phone: '' });
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, u] = await Promise.all([api('/api/admin/stats'), api('/api/admin/users')]);
      setStats(s.stats); setRecent(s.recent); setUsers(u.users);
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => {
    api('/api/auth/me').then(d => {
      if (d.user.role !== 'ADMIN') { setError('Admins only.'); return; }
      setMe(d.user); load();
    }).catch(() => router.push('/login'));
  }, [load, router]);

  async function createUser(e) {
    e.preventDefault(); setError(''); setMsg('');
    try { await api('/api/admin/users', { method: 'POST', body: form }); setMsg('✅ User created — give them the temporary password securely; they must change it after login.'); setForm({ fullName: '', email: '', password: '', role: 'AGENT', phone: '' }); load(); }
    catch (err) { setError(err.message); }
  }
  async function userAction(userId, action, extra = {}) {
    setError(''); setMsg('');
    try { await api('/api/admin/users/action', { method: 'POST', body: { userId, action, ...extra } }); load(); }
    catch (err) { setError(err.message); }
  }

  if (!me && !error) return <div className="spinner" />;
  return (
    <>
      <h1 style={{ fontSize: '1.5rem' }}>Admin dashboard</h1>
      {error && <div className="error mt">{error}</div>}
      {msg && <div className="success mt">{msg}</div>}
      {stats && (
        <>
          <div className="grid mt">
            <div className="stat"><div className="v">{stats.totalBookings}</div><div className="l">Total bookings</div></div>
            <div className="stat"><div className="v">{stats.unassignedNew}</div><div className="l">New unassigned</div></div>
            <div className="stat"><div className="v">{stats.awaitingVerification}</div><div className="l">Payments to verify</div></div>
            <div className="stat"><div className="v">{stats.activeAgents}</div><div className="l">Active agents</div></div>
          </div>
          <div className="card"><h2>Bookings by status & confirmed revenue</h2>
            <div className="flex">{Object.entries(stats.byStatus).map(([s, n]) => <span key={s} className={`badge b-${s}`}>{statusLabel('en', s)}: {n}</span>)}</div>
            <div className="mt">{Object.entries(stats.revenue).length === 0 ? <span className="muted">No confirmed revenue yet.</span> :
              Object.entries(stats.revenue).map(([c, v]) => <p key={c}><b>{c}:</b> {fmtMoney(v, c)}</p>)}</div>
          </div>
          <div className="card"><h2>Recent bookings</h2>
            {recent.map(b => (
              <div className="list-item" key={b.id}><div className="flex space">
                <span><b>{b.ref}</b> · {b.name} · {b.from} → {b.to} · {b.departDate}<br /><span className="muted small">{b.assignedTo || 'Unassigned'} · {fmtDateTime(b.createdAt)}</span></span>
                <span className="flex"><span className={`badge b-${b.status}`}>{statusLabel('en', b.status)}</span>
                <Link className="btn btn-outline btn-sm" href={`/staff/bookings/${b.id}`}>Open</Link></span></div></div>
            ))}
            {recent.length === 0 && <p className="muted">No bookings yet.</p>}
          </div>
        </>
      )}
      <div className="card">
        <h2>Staff users</h2>
        <div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Active</th><th>Last login</th><th>Actions</th></tr></thead>
          <tbody>{users.map(u => (
            <tr key={u.id}><td><b>{u.fullName}</b>{u.mustChangePassword && <span className="muted small"> (must change pw)</span>}</td><td>{u.email}</td>
              <td><select className="input" value={u.role} onChange={e => userAction(u.id, 'setRole', { role: e.target.value })}>
                <option value="AGENT">AGENT</option><option value="ADMIN">ADMIN</option></select></td>
              <td>{u.active ? '✅' : '⛔'}</td><td className="small">{fmtDateTime(u.lastLoginAt)}</td>
              <td><div className="flex">
                <button className="btn btn-ghost btn-sm" onClick={() => userAction(u.id, u.active ? 'deactivate' : 'activate')}>{u.active ? 'Deactivate' : 'Activate'}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { const pw = window.prompt('New temporary password (min 10 chars):'); if (pw) userAction(u.id, 'resetPassword', { newPassword: pw }); }}>Reset pw</button>
              </div></td></tr>
          ))}</tbody></table></div>
        <h3>Add staff user</h3>
        <form onSubmit={createUser}>
          <div className="row3">
            <div className="form-group"><label>Full name</label><input className="input" required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div>
            <div className="form-group"><label>Email</label><input className="input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="form-group"><label>Phone</label><input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div className="row3">
            <div className="form-group"><label>Temporary password (min 10)</label><input className="input" required minLength={10} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
            <div className="form-group"><label>Role</label><select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="AGENT">AGENT</option><option value="ADMIN">ADMIN</option></select></div>
          </div>
          <button className="btn btn-primary">Create user</button>
        </form>
      </div>
    </>
  );
}

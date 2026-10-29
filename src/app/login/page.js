'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client.js';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const d = await api('/api/auth/login', { method: 'POST', body: { email, password } });
      router.push(d.user.role === 'ADMIN' ? '/admin' : '/staff'); router.refresh();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return (
    <div className="card" style={{ maxWidth: 430, margin: '2rem auto' }}>
      <div className="brand-box">
        <img className="brand-logo-img" src="/logo-plane.jpg" alt="Bersabeh Trading airplane logo" />
        <div className="logo-name">Bersabeh Trading</div>
        <span className="muted small">Staff workspace</span>
      </div>
      <h2>Staff login</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={submit}>
        <div className="form-group"><label htmlFor="email">Email</label>
          <input id="email" className="input" type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="form-group"><label htmlFor="pw">Password</label>
          <input id="pw" className="input" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></div>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
      <div className="notice mt small">
        Staff only. If you need an account, ask your office administrator.
        After your first login you will be asked to change your password.
      </div>
    </div>
  );
}

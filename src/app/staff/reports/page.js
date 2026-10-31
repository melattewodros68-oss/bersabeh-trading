'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, fmtMoney, PAGE_REFRESH_EVENT } from '@/lib/client.js';
import { statusLabel } from '@/lib/i18n.js';

const localISO = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return localISO(d); };

function downloadCSV(filename, rows, columns) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const text = [columns.map(c => esc(c.label)).join(','), ...rows.map(r => columns.map(c => esc(r[c.key])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
function Bars({ items, emptyText }) {
  if (!items?.length) return <p className="muted">{emptyText || 'No data in this period.'}</p>;
  const max = Math.max(...items.map(i => i.value || 0), 1);
  return items.map((i, idx) => (
    <div className="bar-row" key={idx}>
      <span className="bar-label">{i.label}</span>
      <span className="bar-track"><span className="bar-fill" style={{ width: `${Math.max(4, Math.round((i.value / max) * 100))}%` }} /></span>
      <b>{i.value}</b>
    </div>
  ));
}
const moneyLines = (obj) => {
  const keys = Object.keys(obj || {});
  if (!keys.length) return '—';
  return keys.map(c => fmtMoney(obj[c], c)).join(' · ');
};

export default function ReportsPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [preset, setPreset] = useState('30');
  const [from, setFrom] = useState(() => daysAgo(29));
  const [to, setTo] = useState(() => localISO(new Date()));
  const [agent, setAgent] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const q = new URLSearchParams({ from, to });
      if (agent) q.set('agent', agent);
      setData(await api(`/api/staff/reports?${q.toString()}`));
    } catch (e) { if (e.status === 401) router.push('/login'); else setError(e.message); } finally { setBusy(false); }
  }, [from, to, agent, router]);

  const loadMe = useCallback(async () => {
    try { const d = await api('/api/auth/me'); setMe(d.user); return d.user; }
    catch (e) {
      if (e.status === 401) { router.push('/login'); return null; }
      setError('Could not check your login (server may be waking up). Check your connection, then tap ↻ Refresh at the top.');
      return null;
    }
  }, [router]);

  useEffect(() => { loadMe(); }, [loadMe]);
  useEffect(() => { if (me) load(); }, [me, load]);

  const refreshData = useCallback(async () => {
    setError('');
    if (me) { await load(); return; }
    const user = await loadMe();
    if (user) await load();
  }, [me, load, loadMe]);
  useEffect(() => {
    const onRefresh = (e) => { e.detail.handled = true; e.detail.done = refreshData(); };
    window.addEventListener(PAGE_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(PAGE_REFRESH_EVENT, onRefresh);
  }, [refreshData]);

  const applyPreset = (p) => {
    setPreset(p);
    const t = localISO(new Date());
    if (p === 'today') { setFrom(t); setTo(t); }
    else if (p === '7') { setFrom(daysAgo(6)); setTo(t); }
    else if (p === '30') { setFrom(daysAgo(29)); setTo(t); }
    else if (p === 'month') { const d = new Date(); setFrom(localISO(new Date(d.getFullYear(), d.getMonth(), 1))); setTo(t); }
  };

  if (!me) return error
    ? <div className="card"><div className="error">{error}</div></div>
    : <div className="spinner" />;
  const s = data?.summary;
  const statusItems = s ? Object.entries(s.byStatus).map(([k, v]) => ({ label: statusLabel('en', k), value: v })).sort((a, b) => b.value - a.value) : [];

  return (
    <>
      <p className="no-print"><Link href="/staff">← Back to dashboard</Link></p>
      <div className="flex space mt">
        <h1 style={{ fontSize: '1.55rem' }}>📊 Reports</h1>
        <span className="muted">{me.role === 'ADMIN' && !agent ? 'All agents' : (agent || me.email)}</span>
      </div>
      {error && <div className="error mt">{error}</div>}

      <div className="card no-print">
        <div className="tabs" style={{ marginBottom: '.4rem' }}>
          {[['today', 'Today'], ['7', 'Last 7 days'], ['30', 'Last 30 days'], ['month', 'This month'], ['custom', 'Custom']].map(([p, label]) => (
            <button key={p} type="button" className={`tab ${preset === p ? 'active' : ''}`} onClick={() => applyPreset(p)}>{label}</button>
          ))}
        </div>
        <div className="row3">
          <div className="form-group"><label>From</label>
            <input className="input" type="date" value={from} max={to} onChange={e => { setPreset('custom'); setFrom(e.target.value); }} /></div>
          <div className="form-group"><label>To</label>
            <input className="input" type="date" value={to} min={from} onChange={e => { setPreset('custom'); setTo(e.target.value); }} /></div>
          {me.role === 'ADMIN' && (
            <div className="form-group"><label>Agent</label>
              <select className="input" value={agent} onChange={e => setAgent(e.target.value)}>
                <option value="">All agents</option>
                {(data?.agents || []).map(a => <option key={a.email} value={a.email}>{a.name} ({a.role})</option>)}
              </select></div>
          )}
        </div>
        <div className="flex">
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={load}>{busy ? 'Loading…' : '↻ Refresh'}</button>
          <button type="button" className="btn btn-outline btn-sm" disabled={!data} onClick={() => downloadCSV(`bersabeh-bookings-${from}-to-${to}.csv`, data.bookingRows, [
            { key: 'ref', label: 'Reference' }, { key: 'created', label: 'Created' }, { key: 'customer', label: 'Customer' },
            { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email' }, { key: 'route', label: 'Route' },
            { key: 'departDate', label: 'Departure' }, { key: 'passengers', label: 'Passengers' }, { key: 'status', label: 'Status' },
            { key: 'agent', label: 'Agent' }, { key: 'quoted', label: 'Quoted' }, { key: 'paid', label: 'Paid' }, { key: 'pnr', label: 'PNR' },
          ])}>⬇ Bookings CSV</button>
          <button type="button" className="btn btn-outline btn-sm" disabled={!data} onClick={() => downloadCSV(`bersabeh-payments-${from}-to-${to}.csv`, data.paymentRows, [
            { key: 'date', label: 'Date' }, { key: 'bookingRef', label: 'Booking' }, { key: 'customer', label: 'Customer' },
            { key: 'method', label: 'Method' }, { key: 'amount', label: 'Amount' }, { key: 'currency', label: 'Currency' },
            { key: 'status', label: 'Status' }, { key: 'reference', label: 'Transaction reference' },
          ])}>⬇ Payments CSV</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => window.print()}>🖨 Print report</button>
        </div>
      </div>

      {busy && !data && <div className="spinner" />}
      {s && (
        <>
          <p className="muted">{data.period.from} → {data.period.to} · Bookings are counted by request date; money by payment date; tickets by issue date.</p>
          <div className="grid">
            <div className="stat"><div className="v">{s.bookingsCreated}</div><div className="l">New booking requests</div></div>
            <div className="stat"><div className="v">{s.ticketsIssued}</div><div className="l">Tickets issued ({s.conversionPct}% of new requests)</div></div>
            <div className="stat"><div className="v" style={{ fontSize: '1.25rem', paddingTop: '.45rem' }}>{moneyLines(s.revenue)}</div><div className="l">Confirmed revenue collected</div></div>
            <div className="stat"><div className="v">{s.claimedCount}</div><div className="l">Payments waiting verification ({moneyLines(s.claimed)})</div></div>
          </div>

          <div className="row">
            <div className="card"><h2>Bookings by status</h2><Bars items={statusItems} /></div>
            <div className="card"><h2>Top destinations</h2><Bars items={data.byDestination} /></div>
          </div>

          <div className="card"><h2>Quoted value & airlines</h2>
            <p><b>Total quoted in period:</b> {moneyLines(s.quoted)}</p>
            <div className="table-wrap mt"><table><thead><tr><th>Airline</th><th>Flights quoted</th><th>Quoted value</th></tr></thead>
              <tbody>{data.byAirline.map((a, i) => <tr key={i}><td><b>{a.airline}</b></td><td>{a.flights}</td><td>{moneyLines(a.quoted)}</td></tr>)}
                {data.byAirline.length === 0 && <tr><td colSpan={3} className="muted">No flights quoted in this period.</td></tr>}</tbody></table></div>
          </div>

          <div className="card"><h2>How customers paid (confirmed)</h2>
            <div className="table-wrap"><table><thead><tr><th>Method</th><th>Currency</th><th>Payments</th><th>Total</th></tr></thead>
              <tbody>{data.paymentMethods.map((p, i) => <tr key={i}><td><b>{p.method}</b></td><td>{p.currency}</td><td>{p.count}</td><td>{fmtMoney(p.amount, p.currency)}</td></tr>)}
                {data.paymentMethods.length === 0 && <tr><td colSpan={4} className="muted">No confirmed payments in this period.</td></tr>}</tbody></table></div>
          </div>

          {me.role === 'ADMIN' && (
            <div className="card"><h2>Team performance</h2>
              <div className="table-wrap"><table><thead><tr><th>Agent / admin</th><th>New bookings handled</th><th>Tickets issued</th><th>Confirmed revenue</th></tr></thead>
                <tbody>{data.agentPerformance.map((a, i) => <tr key={i}><td><b>{a.agent}</b></td><td>{a.bookings}</td><td>{a.issued}</td><td>{moneyLines(a.revenue)}</td></tr>)}
                  {data.agentPerformance.length === 0 && <tr><td colSpan={4} className="muted">No activity in this period.</td></tr>}</tbody></table></div>
            </div>
          )}

          <div className="card"><h2>Bookings in period ({data.bookingRows.length})</h2>
            <div className="table-wrap"><table><thead><tr><th>Ref</th><th>Date</th><th>Customer</th><th>Route</th><th>Status</th><th>Quoted</th><th>Paid</th></tr></thead>
              <tbody>{data.bookingRows.slice(0, 100).map((r, i) => <tr key={i}><td><b>{r.ref}</b></td><td>{r.created}</td><td>{r.customer}</td><td className="small">{r.route}</td><td><span className={`badge b-${r.status}`}>{statusLabel('en', r.status)}</span></td><td>{r.quoted || '—'}</td><td>{r.paid || '—'}</td></tr>)}
                {data.bookingRows.length === 0 && <tr><td colSpan={7} className="muted">No bookings in this period.</td></tr>}</tbody></table></div>
            {data.bookingRows.length > 100 && <p className="muted mt">Showing first 100 — download the CSV for the full list.</p>}
          </div>
        </>
      )}
    </>
  );
}

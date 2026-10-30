'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLang } from './Lang.jsx';
import { api } from '@/lib/client.js';
import { BUSINESS } from '@/lib/config.js';

export default function Header() {
  const { lang, setLang, t } = useLang();
  const [me, setMe] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [counts, setCounts] = useState(null);
  const pathname = usePathname() || '/';
  const router = useRouter();

  useEffect(() => {
    api('/api/auth/me').then(d => setMe(d.user)).catch(() => setMe(null));
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (menuOpen && me) api('/api/staff/bookings?scope=mine').then(d => setCounts(d.counts)).catch(() => {});
  }, [menuOpen, me]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const logout = async () => {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch {}
    setMe(null); setMenuOpen(false); router.push('/'); router.refresh();
  };
  const cls = (href) => (pathname === href ? 'active' : '');
  const isStaffArea = pathname.startsWith('/staff') || pathname.startsWith('/admin');

  const scopeGo = (scope) => {
    setMenuOpen(false);
    if (pathname === '/staff') {
      window.dispatchEvent(new CustomEvent('bt-scope', { detail: scope }));
      window.history.replaceState(null, '', '/staff?scope=' + scope);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      router.push('/staff?scope=' + scope);
    }
  };

  let sections = [];
  if (pathname.startsWith('/staff/bookings/')) {
    sections = [
      ['#overview', '🧾 Overview & passengers'], ['#flights', '✈️ Flights & quote'],
      ['#payments', '💳 Payments'], ['#messages', '💬 Messages & notes'], ['#audit', '🕘 Audit trail'],
    ];
  } else if (pathname === '/admin') {
    sections = [['#stats', '📊 Stats & revenue'], ['#recent', '🕘 Recent bookings'], ['#users', '👥 Staff users']];
  } else if (pathname === '/staff') {
    sections = [['#change-password', '🔑 Change my password']];
  }

  return (
    <>
      <header className="header">
        <Link className="logo" href="/">
          <img className="logo-img" src="/logo-wing.png" alt="Ethiopian-inspired green, gold and red wing emblem" />
          <span><span className="logo-name">{BUSINESS.name}</span><small>{BUSINESS.tagline}</small></span>
        </Link>
        <nav className={isStaffArea ? 'nav staff-nav' : 'nav'}>
          {me && isStaffArea && (
            <button type="button" className="btn btn-primary btn-sm menu-btn" aria-expanded={menuOpen}
              aria-label="Open menu" onClick={() => setMenuOpen(true)}>☰ Menu</button>
          )}
          <Link className={cls('/')} href="/">{t('nav_home')}</Link>
          <Link className={cls('/track')} href="/track">{t('nav_track')}</Link>
          {me ? (
            <>
              <Link className={pathname.startsWith('/staff') ? 'active' : ''} href="/staff">{t('nav_dashboard')}</Link>
              {me.role === 'ADMIN' && <Link className={cls('/admin')} href="/admin">{t('nav_admin')}</Link>}
              <button className="btn btn-ghost btn-sm" onClick={logout}>{t('logout')} ({me.fullName?.split(' ')[0]})</button>
            </>
          ) : (
            <Link className={cls('/login')} href="/login">{t('nav_staff')}</Link>
          )}
          <button className="lang-btn" onClick={() => setLang(lang === 'en' ? 'am' : 'en')}>
            {lang === 'en' ? 'አማርኛ' : 'English'}
          </button>
        </nav>
      </header>

      {me && isStaffArea && menuOpen && (
        <>
          <div className="drawer-backdrop" onClick={() => setMenuOpen(false)} />
          <aside className="drawer" aria-label="Staff menu">
            <div className="drawer-head">
              <img src="/logo-wing.png" alt="" />
              <b>{BUSINESS.name}<br /><span className="muted small">What do you want to do?</span></b>
              <button type="button" className="drawer-close" aria-label="Close menu" onClick={() => setMenuOpen(false)}>✕</button>
            </div>
            <div className="drawer-user">👤 <b>{me.fullName}</b><br /><span className="muted">{me.email} · {me.role}</span></div>

            <h4>My work</h4>
            <Link className={`drawer-link ${pathname === '/staff' ? 'active' : ''}`} href="/staff" onClick={() => setMenuOpen(false)}>🏠 Dashboard</Link>
            <button type="button" className="drawer-link" onClick={() => scopeGo('new')}>🆕 New requests{counts?.new > 0 && <span className="menu-badge">{counts.new}</span>}</button>
            <button type="button" className="drawer-link" onClick={() => scopeGo('mine')}>📁 My bookings{counts?.mine > 0 && <span className="menu-badge gold">{counts.mine}</span>}</button>
            {me.role === 'ADMIN' && <button type="button" className="drawer-link" onClick={() => scopeGo('all')}>🗂️ All bookings</button>}
            <Link className={`drawer-link ${pathname === '/staff/reports' ? 'active' : ''}`} href="/staff/reports" onClick={() => setMenuOpen(false)}>📊 Reports</Link>

            {me.role === 'ADMIN' && (
              <>
                <h4>Manage</h4>
                <Link className={`drawer-link ${pathname === '/admin' ? 'active' : ''}`} href="/admin" onClick={() => setMenuOpen(false)}>🛡️ Admin overview</Link>
                <Link className="drawer-link" href="/admin#users" onClick={() => setMenuOpen(false)}>👥 Staff users & emails</Link>
              </>
            )}

            {sections.length > 0 && (
              <>
                <h4>On this page</h4>
                {sections.map(([href, label]) => (
                  <a key={href} className="drawer-link" href={href} onClick={() => setMenuOpen(false)}>{label}</a>
                ))}
              </>
            )}

            <h4>More</h4>
            <Link className="drawer-link" href="/" onClick={() => setMenuOpen(false)}>✈️ Customer home page</Link>
            <Link className="drawer-link" href="/track" onClick={() => setMenuOpen(false)}>🔎 Track booking</Link>

            {pathname !== '/staff' && <Link className="drawer-link" href="/staff#change-password" onClick={() => setMenuOpen(false)}>🔑 Change my password</Link>}
            <button type="button" className="drawer-link" onClick={logout}>🚪 {t('logout')}</button>
          </aside>
        </>
      )}
    </>
  );
}

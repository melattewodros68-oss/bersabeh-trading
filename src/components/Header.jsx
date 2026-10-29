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
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    api('/api/auth/me').then(d => setMe(d.user)).catch(() => setMe(null));
  }, [pathname]);

  const logout = async () => {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch {}
    setMe(null); router.push('/'); router.refresh();
  };
  const cls = (href) => (pathname === href ? 'active' : '');

  return (
    <header className="header">
      <Link className="logo" href="/">
        <img className="logo-img" src="/logo-plane.jpg" alt="Bersabeh Trading airplane logo" />
        <span><span className="logo-name">{BUSINESS.name}</span><small>{BUSINESS.tagline}</small></span>
      </Link>
      <nav className="nav">
        <Link className={cls('/')} href="/">{t('nav_home')}</Link>
        <Link className={cls('/track')} href="/track">{t('nav_track')}</Link>
        {me ? (
          <>
            <Link className={cls('/staff')} href="/staff">{t('nav_dashboard')}</Link>
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
  );
}

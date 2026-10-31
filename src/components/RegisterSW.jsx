'use client';
import { useEffect } from 'react';

export default function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    // If an updated service worker takes control, reload THIS page once
    // (same URL) so the fresh app shell/JS is used — prevents stale
    // bundles from sending taps to wrong screens after an update.
    const hadController = !!navigator.serviceWorker.controller;
    const onControllerChange = () => {
      if (!hadController) return;
      try {
        if (window.sessionStorage.getItem('bt-sw-reloaded')) return;
        window.sessionStorage.setItem('bt-sw-reloaded', '1');
      } catch {}
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    let interval;
    let cancelled = false;
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        if (cancelled) return;
        reg.update().catch(() => {});
        const check = () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); };
        document.addEventListener('visibilitychange', check);
        interval = setInterval(check, 30 * 60 * 1000);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);
  return null;
}

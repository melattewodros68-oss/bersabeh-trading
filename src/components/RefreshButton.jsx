'use client';
import { useEffect, useRef, useState } from 'react';
import { PAGE_REFRESH_EVENT } from '@/lib/client.js';

const SCROLL_KEY = 'bt-refresh-scroll';

/**
 * Global Refresh button shown in the header on every page.
 * - Asks the service worker to check for a newer app version.
 * - Lets the current page reload its own data first (staff lists, booking
 *   workspace, reports, admin, tracking) so typed-but-unsaved text and
 *   filters survive. Pages opt in via PAGE_REFRESH_EVENT.
 * - If no page handles it, does a normal full-page reload of the exact
 *   current URL (path + query + hash stay the same).
 */
export default function RefreshButton() {
  const [refreshing, setRefreshing] = useState(false);
  const busyRef = useRef(false);

  // Restore scroll position after a full-page reload triggered here.
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(SCROLL_KEY);
      if (!raw) return;
      window.sessionStorage.removeItem(SCROLL_KEY);
      const saved = JSON.parse(raw);
      if (saved && saved.url === window.location.href && saved.y > 0) {
        window.requestAnimationFrame(() => window.scrollTo(0, saved.y));
      }
    } catch {}
  }, []);

  async function refreshPage() {
    if (busyRef.current) return;
    busyRef.current = true;
    setRefreshing(true);
    const started = Date.now();
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration().catch(() => null);
        if (reg) await reg.update().catch(() => {});
      }
      const detail = { handled: false, done: null };
      window.dispatchEvent(new CustomEvent(PAGE_REFRESH_EVENT, { detail }));
      if (detail.handled) {
        if (detail.done) {
          await Promise.race([
            Promise.resolve(detail.done).catch(() => {}),
            new Promise(resolve => setTimeout(resolve, 12000)),
          ]);
        }
        // No router.refresh(): the page already reloaded its data, and
        // staying silent keeps the exact URL (incl. #section) + scroll.
      } else {
        try {
          window.sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ url: window.location.href, y: window.scrollY || 0 }));
        } catch {}
        window.location.reload();
        return;
      }
    } finally {
      const wait = Math.max(0, 600 - (Date.now() - started));
      setTimeout(() => { busyRef.current = false; setRefreshing(false); }, wait);
    }
  }

  return (
    <button type="button" className={`refresh-btn${refreshing ? ' is-refreshing' : ''}`}
      onClick={refreshPage} disabled={refreshing}
      aria-label="Refresh this page" title="Refresh this page">
      <span className="refresh-icon" aria-hidden="true">↻</span>
      <span className="refresh-label">Refresh</span>
    </button>
  );
}

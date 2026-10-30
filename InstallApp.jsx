'use client';
import { useEffect, useState } from 'react';

export default function InstallApp() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (standalone) return;
    let recentlyDismissed = false;
    try {
      const at = Number(window.localStorage.getItem('bt-install-dismissed') || 0);
      recentlyDismissed = Date.now() - at < 14 * 24 * 60 * 60 * 1000;
    } catch {}
    if (recentlyDismissed) return;
    setDismissed(false);
    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent));
    const onPrompt = (e) => { e.preventDefault(); setPromptEvent(e); };
    const onInstalled = () => setDismissed(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (dismissed || (!promptEvent && !isIOS)) return null;

  const close = () => {
    setDismissed(true);
    try { window.localStorage.setItem('bt-install-dismissed', String(Date.now())); } catch {}
  };
  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    try { await promptEvent.userChoice; } catch {}
    setPromptEvent(null); close();
  };

  return (
    <div className="install-bar no-print" role="dialog" aria-label="Install Bersabeh app">
      <img src="/logo-wing.png" alt="" />
      <div className="install-text">
        <b>Install the Bersabeh app</b>
        <span>{isIOS && !promptEvent
          ? 'Tap Share, then “Add to Home Screen” — it opens full-screen like an app.'
          : 'Faster booking & tracking, right from your home screen.'}</span>
      </div>
      {promptEvent && <button type="button" className="btn btn-primary btn-sm" onClick={install}>Install</button>}
      <button type="button" className="install-close" aria-label="Dismiss install message" onClick={close}>✕</button>
    </div>
  );
}

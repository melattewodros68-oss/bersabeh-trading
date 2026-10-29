'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { dict } from '@/lib/i18n.js';

const Ctx = createContext({ lang: 'en', setLang: () => {}, t: (k) => k });
export function LangProvider({ children }) {
  const [lang, setLangState] = useState('en');
  useEffect(() => {
    const saved = window.localStorage.getItem('bt-lang');
    if (saved === 'am' || saved === 'en') setLangState(saved);
  }, []);
  const setLang = (l) => { setLangState(l); try { window.localStorage.setItem('bt-lang', l); } catch {} };
  const t = (k) => dict[lang]?.[k] || dict.en[k] || k;
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}
export const useLang = () => useContext(Ctx);

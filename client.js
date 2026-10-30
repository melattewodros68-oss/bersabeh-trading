'use client';
export async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok || data.success === false) throw new Error(data.message || ('Request failed (' + res.status + ')'));
  return data;
}
export const fmtMoney = (amount, currency) =>
  `${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency || ''}`;
export const fmtDateTime = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
};

'use client';

/** Window event dispatched by the global Refresh button. Pages that can
 * reload their own data listen for it, set `detail.handled = true` and
 * (optionally) `detail.done = <promise>` on the event detail. */
export const PAGE_REFRESH_EVENT = 'bt-page-refresh';

export async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok || data.success === false) {
    const error = new Error(data.message || ('Request failed (' + res.status + ')'));
    error.status = res.status;
    throw error;
  }
  return data;
}
export const fmtMoney = (amount, currency) =>
  `${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency || ''}`;
export const fmtDateTime = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
};

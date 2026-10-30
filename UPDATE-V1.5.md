# UPDATE V1.5 — Simpler menu, Reports, installable phone app (PWA)

## 1) Simpler & friendlier hamburger menu (☰ Menu)
- Bigger touch targets and plain groups: **My work** (Dashboard, New requests
  with a red count badge, My bookings with a gold badge, **Reports**),
  **Manage** (admin only), **On this page** shortcuts, **More**.
- Counts refresh every time the menu opens, so agents see waiting work at a glance.
- On phones in staff/admin pages, duplicate header links hide — the menu button
  and language switch remain. Nothing to hunt through.

## 2) New Reports section — `/staff/reports`
Open via ☰ Menu → Reports, or the **Open Reports** button on the dashboard.
- Fast ranges: Today / Last 7 days / Last 30 days / This month / Custom dates.
  Admins can filter by agent; agents automatically see only their own work.
- Cards: new requests, tickets issued (+ conversion %), confirmed revenue by
  currency, payments waiting verification.
- Charts/tables: bookings by status, top destinations, airlines + quoted
  value, payment methods (Telebirr/CBE/etc.), team performance (admin),
  booking list for the period.
- **Downloads:** Bookings CSV and Payments CSV (open in Excel/Sheets), plus
  Print. Counting rules: bookings by request date, money by payment date,
  tickets by issue date.

## 3) Installable on phones (real app, not a shortcut)
v1.5 is a **PWA**: web app manifest, proper 192/512 + maskable icons (your wing
emblem), theme colour, and a service worker (app-shell cache; bookings/APIs are
never cached, staff data is always live). A friendly **Install** banner also
appears automatically when the browser allows it.

**Android (Chrome) after deploying v1.5:**
1. Delete the old home-screen shortcut if you made one (it stays separate).
2. Open the live site in Chrome (not Incognito), browse a page or two.
3. Tap **Install** on our banner — or Chrome ⋮ menu → **Install app**.
4. Result: **Bersabeh** appears in the app drawer and opens full-screen like a
   native app (no browser bars), with splash screen from the wing icon.
   If "Install app" doesn't show yet: refresh once (the service worker must
   register on the first visit), update Chrome, and re-check the ⋮ menu.

**iPhone (Safari):** Share → **Add to Home Screen**. It opens full-screen in
standalone mode. Apple never shows an automatic install prompt and keeps web
apps on the Home Screen — that's an Apple limitation, not a fault in the app.

## ⚠️ Protect your real payment details
Delete `src\lib\config.js` from the extracted v1.5 copy BEFORE uploading, so
your edited Telebirr/CBE version in GitHub is not overwritten.

## Update steps (≈10 min)
1. Extract `bersabeh-ticket-app-v1.5.zip` fresh; delete `src\lib\config.js`.
2. GitHub → Add file → Upload files → Ctrl+A drag EVERYTHING in. Must include:
   `public/manifest.webmanifest`, `public/sw.js`, `public/icons/` (3 PNGs),
   `src/components/RegisterSW.jsx`, `src/components/InstallApp.jsx`,
   `src/components/Header.jsx`, `src/app/staff/reports/page.js`,
   `src/app/api/staff/reports/route.js`, `src/app/layout.js`, `globals.css`.
3. Commit: `v1.5 friendly menu + reports + installable app` → Render deploys
   → **Live** → **Ctrl+F5**.
4. Verify on desktop: ☰ Menu shows badges; Reports loads with your real totals;
   open `/manifest.webmanifest` and `/sw.js` on the live domain (both should load).
5. Verify on Android phone with the Install steps above; then have each agent
   install it too — one-tap access to their dashboard.
6. Rollback if needed: Render → Deploys → previous deploy → Rollback.
   (If an old service worker ever looks stale after an update, our worker
   version-checks on each deploy; a hard refresh also clears it.)

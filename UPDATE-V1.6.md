# UPDATE V1.6 — navigation reliability fix + Refresh button on every page

## Reported problem

Clicking some buttons could land the user on the staff dashboard / staff
login instead of staying on the expected screen, and there was no easy
Refresh button inside the app.

## What the audit found

Every visible link/button was first checked in the source and then clicked
in a real mobile browser (390 x 844). No button had a simply wrong address.
The risky pieces were reliability issues that can make a tap land on the
wrong screen in real phone/PWA use:

1. **Manual browser-history change** — the menu queue switch used raw
   `history.replaceState`, which can fight Next.js' own router history.
2. **PWA service worker cached app-navigation payloads** — Next.js client
   navigation (`_rsc` requests) must never be served from an old cache.
3. **Protected pages bounced to Staff login on any error** — a waking
   Render server or brief network failure was treated the same as
   "logged out".
4. **Header changed under the user's finger** — while login state was
   loading, "Staff login" could be replaced by "Staff dashboard".
5. **Several buttons relied on the browser's implicit submit type** —
   now every button is explicitly `button` or `submit`.

## Fixes in v1.6

- Queue switching now uses Next's router; "On this page" menu items are
  scroll-in-place buttons that cannot leave the current booking/admin
  page.
- Service worker bumped to `bersabeh-v1.6-1`: APIs, `/staff`, `/admin`
  and all Next router/RSC requests bypass the cache completely. Only
  genuine static files and the 3 public shell pages are cached.
- The app now checks for a new service worker on load/focus and reloads
  the **same URL once** after an update takes control.
- Staff/Admin/Reports/booking pages redirect to login only on a real
  401. Temporary server/network errors stay on the page with a message
  telling the user to tap Refresh.
- While login state loads, the header shows a non-clickable placeholder
  instead of swapping links mid-tap. Header tap targets are now at
  least 44 px high.
- API calls are explicitly same-origin credentialed requests with
  `cache: 'no-store'`, so Refresh always reads live data.

## New global Refresh button (every page)

A green **↻ Refresh** button is now in the header on **every page**:
home, Track, login, staff dashboard, booking workspace, Reports and
Admin. On small phones it shows as a round ↻ icon button.

How it behaves:

- First checks for a newer installed-app/service-worker version.
- Data screens (dashboard, booking workspace, Reports, Admin, and a
  loaded Track booking) reload their live data **in place** — same URL,
  same section/scroll, and typed-but-unsent flight/payment/message
  text, searches and report filters are preserved.
- The customer success screen keeps the booking reference visible.
- The customer request form / staff login ask for confirmation before a
  full reload would clear typed details.
- Any other page performs a normal full reload of the **exact current
  URL** (path + query + #section), restoring scroll position.

Reports keeps its own local "↻ Refresh" for the report filters as well.

## Navigation that is intentionally supposed to open `/staff`

These are correct by design: **Staff dashboard**, **Dashboard**,
**New requests**, **My bookings**, **All bookings**, **Back to
dashboard**, a successful agent login, and **Take request** (assigns
the booking and switches the dashboard to "Mine" — then tap **Open
workspace**). No other action button should land on `/staff`.

## Verification performed

- Production build: PASS.
- API smoke test: **19/19 PASS** (full booking -> quote -> payment ->
  ticket flow).
- Mobile browser click audit: **48/48 PASS** — public buttons, Track
  actions, agent login, dashboard tabs/Take/Open, booking workspace
  actions, hamburger queues and on-page anchors, browser Back/Forward,
  Reports, admin actions, global Refresh on every page type,
  typed-form preservation, and the service-worker cache contents.
- Reports API: unauthenticated = 401; authenticated totals returned.

## Deploy (about 10 minutes)

1. Extract `bersabeh-ticket-app-v1.6.zip` into a fresh folder.
2. **Delete `src\lib\config.js` from the extracted copy** so your real
   Telebirr/CBE details already saved in GitHub are not overwritten.
3. GitHub repo -> **Add file -> Upload files** -> select everything
   (Ctrl+A) and drag it in. The upload **must** include:
   `public/sw.js`, `src/components/RefreshButton.jsx` (new),
   `src/components/Header.jsx`, `src/components/RegisterSW.jsx`,
   `src/lib/client.js`, `src/app/globals.css`, `src/app/page.js`,
   `src/app/track/page.js`, `src/app/login/page.js`,
   `src/app/staff/page.js`, `src/app/staff/bookings/[id]/page.js`,
   `src/app/staff/reports/page.js`, `src/app/admin/page.js`.
4. Commit with message: `v1.6 navigation fix + refresh button`.
5. Wait for Render to show **Live**, open the site and press
   **Ctrl+F5** once. On each phone, open the installed Bersabeh app,
   wait a few seconds and tap the new **↻ Refresh** once (close and
   reopen the app if the old shell was open during deployment). No
   need to uninstall/reinstall the PWA.
6. Check: ↻ Refresh is visible at the top; open a booking workspace,
   use Menu -> Payments (same booking, `#payments`), tap Refresh
   (same booking/section); Reports and Track buttons stay on their
   pages; Telebirr/CBE details are unchanged on the Track page.

Database, Neon, Render environment variables: **no changes**.
Rollback if needed: Render -> Deploys -> previous deploy -> Rollback.

## If one specific button still misbehaves after v1.6

Please send: (1) the exact button name, (2) the page you were on,
(3) who was logged in (customer / agent / admin), and (4) a screenshot
or short screen recording. The full 48-click audit passes, so that
detail will point straight at any device-specific case left.

# UPDATE TO v1.4 — Ethiopian flag emblem, Ethiopian-livery hero, staff hamburger menu

## What changes
1. **Masthead icon**: the airplane photo is replaced by an original
   **Ethiopian-flag emblem** (`public/logo-flag.svg`: green/gold/red stripes,
   blue star disc) in the header, staff login, footer and favicon.
   > Trademark note: this is an original flag emblem, NOT Ethiopian Airlines'
   > registered logo, and the hero plane carries tricolour tail colours with
   > no airline name/wordmark. Using the airline's official logo without being
   > an authorised agent could mislead customers and infringe their trademark.
   > If Bersabeh is an authorised Ethiopian Airlines agent and the airline
   > supplies official logo files, replace `public/logo-flag.svg` with the
   > official SVG (same filename) — nothing else changes.
2. **Request-a-Flight hero**: new photo of a jet with an Ethiopian tricolour
   tail over Addis Ababa (`public/hero-et.jpg`), with the flag emblem as a
   badge over the photo — plane **and** flag together, as requested.
3. **Hamburger staff menu (☰ Staff menu)**: appears in the sticky header on
   every staff/admin page once logged in. Slide-in drawer with:
   Work queues (New requests / My bookings / All bookings for admin),
   Admin links, **On-this-page shortcuts** (booking workspace: Overview,
   Flights & quote, Payments, Messages, Audit; Admin page: Stats, Recent,
   Staff users; Dashboard: Change my password), Customer view links, Logout.
   This replaces scrolling one long page. The old top links remain as well.
4. No database/settings changes. Verified: build + 19/19 smoke test, both new
   assets serving, menu present in the shipped bundle.

## ⚠️ Protect your real payment details
Delete `src\lib\config.js` from the extracted v1.4 copy BEFORE uploading,
so your edited Telebirr/CBE version in GitHub is not overwritten
(pencil-edit it back on GitHub after deploy if you forget).

## Update steps (≈10 min)
1. Extract `bersabeh-ticket-app-v1.4.zip` fresh.
2. Delete `src\lib\config.js` from the extracted copy (see above).
3. GitHub repo → Add file → Upload files → Ctrl+A drag EVERYTHING in.
   Must include: `public/logo-flag.svg`, `public/hero-et.jpg`,
   `src/components/Header.jsx`, `src/app/globals.css`, the edited pages.
   (The old `public/logo-plane.jpg` will remain in the repo unused — harmless;
   delete it on GitHub if you like tidiness.)
4. Commit message: `v1.4 flag emblem + Ethiopian hero + staff hamburger menu`
   → Commit. Render auto-deploys → wait for **Live** → **Ctrl+F5**.
5. Verify:
   - Header/login/footer show the flag emblem; tab icon updated.
   - Home hero shows the tricolour-tail plane with the flag badge corner.
   - Log in as agent → **☰ Staff menu** appears in the header → open it →
     New requests switches the queue; in a booking workspace use the
     On-this-page shortcuts to jump to Payments/Messages instantly.
   - Payment stage still shows your real Telebirr/CBE numbers.
6. Rollback if needed: Render → Deploys → previous deploy → Rollback.

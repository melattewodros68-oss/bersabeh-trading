# UPDATE V1.4.1 — Your supplied wing emblem + Ethiopian hero + staff hamburger menu

This package supersedes the earlier v1.4 ZIP (same features, corrected icon).
If you have NOT deployed v1.4 yet, ignore that ZIP and use THIS one.
If you already deployed v1.4, uploading this v1.4.1 over it swaps only the icon.

## What changes
1. **Masthead icon**: your supplied Ethiopian-inspired green/gold/red **wing
   emblem** (`public/logo-wing.png`, white background made transparent,
   ~11 KB) replaces the flag emblem — in the header, staff login, footer,
   staff-menu drawer and favicon.
   > Note: the wing closely resembles Ethiopian Airlines' tail mark. It is
   > used at the business's own choice/responsibility; an official logo should
   > only be used with the airline's authorisation.
2. **Request-a-Flight hero**: Ethiopian tricolour-tail jet over Addis Ababa
   (`public/hero-et.jpg`) with the wing emblem badged in the corner.
3. **Hamburger staff menu (☰ Staff menu)** in the sticky header on all
   agent/admin pages: work queues, admin links, on-this-page shortcuts
   (Overview / Flights & quote / Payments / Messages / Audit; Admin Stats /
   Recent / Users), customer-view links, change password, logout.
4. No database/settings changes. Verified: build + 19/19 smoke test, wing and
   hero assets serving (HTTP 200), old flag references gone, menu in bundle.

## ⚠️ Protect your real payment details
Delete `src\lib\config.js` from the extracted v1.4.1 copy BEFORE uploading,
so your edited Telebirr/CBE version in GitHub is not overwritten.

## Update steps (≈10 min)
1. Extract `bersabeh-ticket-app-v1.4.1.zip` fresh; delete `src\lib\config.js`
   from that copy.
2. GitHub repo → Add file → Upload files → Ctrl+A drag EVERYTHING in.
   Must include: `public/logo-wing.png`, `public/hero-et.jpg`,
   `src/components/Header.jsx`, `src/app/globals.css`, edited pages.
   (Old `public/logo-plane.jpg` / `public/logo-flag.svg` files left in the
   repo are unused and harmless — delete them on GitHub if you want tidiness.)
3. Commit message: `v1.4.1 wing emblem + Ethiopian hero + staff hamburger menu`
   → Commit. Render auto-deploys → **Live** → **Ctrl+F5**.
4. Verify: wing emblem in header/tab; hero shows tricolour-tail plane + wing
   badge; login as agent → **☰ Staff menu** → try New/My queues and the
   Payments jump inside a booking; payment stage shows real Telebirr/CBE.
5. Rollback if needed: Render → Deploys → previous deploy → Rollback.

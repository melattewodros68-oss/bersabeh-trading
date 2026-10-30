# Bersabeh Trading — Flight Request & Ticketing Webapp (Rebuild v1.5)

"> **v1.5 changes:** simpler/friendlier staff hamburger menu with live queue
> badges, a **Reports** section (`/staff/reports`: period filters, revenue,
> destinations, airlines, payment methods, team performance, CSV downloads),
> and **PWA installability** (manifest + icons + service worker + install
> banner — Android installs it as a real full-screen app). Updating: see
> **UPDATE-V1.5.md** — delete `src/lib/config.js` from the extracted copy
> before uploading to protect your real payment accounts.
>

"> **v1.4 changes:** Ethiopian-inspired wing emblem masthead
> (`public/logo-wing.png`), Ethiopian-livery hero photo with wing badge
> (`public/hero-et.jpg`), and a **hamburger staff menu** in the sticky header
> for agent/admin pages (work queues + on-page section shortcuts). Updating:
> see **UPDATE-V1.4.1.md** — delete `src/lib/config.js` from the extracted copy
> before uploading to protect your real payment accounts.
>

"> **v1.3 changes:** realistic airplane logo image (`public/logo-plane.jpg`,
> header/login/footer/favicon), larger Bersabeh Trading wordmark, and a
> **LuBella Technology** developer credit in the footer with clickable
> WhatsApp/call/email/Telegram (edit `src/lib/developer.js`). Updating a
> deployed site: see **UPDATE-V1.3.md** — delete `src/lib/config.js` from
> the extracted copy before uploading to protect your real payment accounts.
>

> **v1.2 changes:** bold Ethiopian redesign (new layout, hero photo in
> `public/hero.jpg`, refreshed staff/admin) + **Change email** action in
> Admin (handover-friendly; bookings follow the user to the new email).
> Updating a deployed v1.1: see **UPDATE-V1.2.md** — IMPORTANT, delete
> `src/lib/config.js` from the extracted copy before uploading so your
> real payment accounts in GitHub are not overwritten.
>

> **v1.1 changes:** dual-mode database (free PostgreSQL via `DATABASE_URL`,
> e.g. Neon — otherwise local file for dev), demo-password hint removed from
> the login page, no demo agent is seeded on PostgreSQL, Render blueprint
> (`render.yaml`) included. See **DEPLOY-FREE-STAGE2.md** for free hosting.
> Local run is unchanged: `npm install` then `npm run dev`.


A complete rebuild of the old Google Apps Script/Sheets system as a modern
**Next.js** webapp with a server API, real staff accounts, and server-side
security. Built for a **manual-quote ticket office**: customer requests →
agent quotes → customer approves → customer pays by Telebirr/CBE/bank and
reports the reference → agent verifies → agent tickets in the airline portal
and records the **PNR + e-ticket numbers** → customer sees/prints the ticket.

## Try it now (live preview in this workspace)

Demo staff accounts (seeded on first run — **change them after first login**;
the app warns until you do):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@bersabeh.local` | `Admin@2026!` |
| Agent | `agent@bersabeh.local` | `Agent@2026!` |

**5-minute demo walkthrough**
1. On the home page, submit a flight request as a customer. Note the `BTB-XXXXXX` reference.
2. Log in as the Agent → *New requests* → **Take request** → *Open workspace*.
3. Add a flight (type the total price for ALL passengers) → **Send quote to customer**.
4. Open *Track booking* (reference + the customer email you used) → **Accept quote** → pay section appears → submit a fake Telebirr reference ("I have paid").
5. Back in the agent workspace → **Verify & confirm** the payment → status becomes *Payment confirmed* → enter a PNR + ticket number per passenger → **Mark ticket issued**.
6. Track the booking again as the customer → e-ticket card with PNR, ticket numbers, and Print/PDF button.
7. Log in as Admin → revenue by currency, status counts, staff-user management.
8. Toggle **አማርኛ** in the header — public pages are fully translated (staff screens are English in v1).

A completed smoke-test booking `BTB-YFK89Y` (customer email `smoke@example.et`,
status Ticket issued) is in the database so dashboards aren't empty.
**Reset all data:** stop the server and delete `data/db.json` — it is
re-seeded (demo users only) on next start.

## Run it on your own machine / server

Requirements: Node.js 20+.

```bash
cd bersabeh-app
npm install
npm run build
npm start          # serves on http://localhost:3000
# or for development:  npm run dev
```

Automated end-to-end check (19 assertions: lifecycle, auth, state-machine):

```bash
python3 smoke_test.py
```

## Configure for your real office (before launch)

1. **Payment accounts & contacts** — edit `src/lib/config.js`: real Telebirr
   number, CBE account, phone/WhatsApp, email, address, hours, airport list.
2. **Secrets** — copy `.env.example` to `.env.local` and fill it in:
   set the session secret to the output of `openssl rand -hex 32`;
   set the initial admin email/password; and enable the secure-cookie flag
   (value `1`) when serving over HTTPS.
3. **First login** — log in as admin, change the password, create real agent
   accounts (Admin → Add staff user), then deactivate the demo Agent account.
4. **Backups** — back up the `data/` folder daily (it is the whole database).
5. Delete the smoke-test booking by resetting the data file (see above).

## How every critical audit finding was fixed

| Old system flaw | Rebuild |
|---|---|
| Privileged functions callable by anyone | Every staff API route verifies a signed httpOnly session + role **on the server**; agents can only mutate their own/unassigned bookings |
| Login token discarded by frontend | Cookie-based sessions (8h expiry), re-validated against the DB on every request; deactivation takes effect immediately |
| Default passwords, weak SHA-256 + public salt | bcrypt hashing; seeded accounts flagged *must change password*; min 10-char passwords; login throttling (10/10 min) |
| No workflow UI (quote/pay/issue impossible) | Complete agent workspace: add flights, send quote, verify/record payments, issue ticket, cancel, message; real Admin dashboard + user management |
| Broken "View Details" / blank Admin page | Proper staff booking endpoint + workspace; `/admin` fully built |
| Any status jump allowed (issue without payment) | Server-side state-machine: e.g. ticketing requires *Confirmed* + zero balance in every currency + PNR + a ticket number per passenger |
| Predictable booking IDs | Crypto-random `BTB-XXXXXX` references |
| Stored XSS via `innerHTML` | React rendering (escaped by default); no injected HTML strings |
| Customer pays blind; price disappears after approval | Full itinerary (times, baggage, stopover, deadline) always visible; totals labelled "total for all passengers"; payment accounts + balance shown |
| Fake Amharic toggle | Real EN/AM dictionary for all customer pages + Noto Sans Ethiopic font; choice persists |
| One passenger name for a group | Per-passenger records: name, type, DOB, gender, nationality, passport + expiry (passport masked in customer view) |
| Passport numbers leaked in admin recent-list | List endpoints return summaries only; full detail is staff-authenticated; audit trail on every booking |
| Under/over-payment invisible | Per-currency quoted/paid/balance reconciliation; claimed vs confirmed payment states |
| Sheet formula injection, destructive init | JSON data store with atomic writes; no spreadsheet formulas; no wipe function exposed |

## Architecture

```
src/app/page.js                  Customer request form (EN/AM)
src/app/track/page.js            Tracking, quote approval, payment claim, e-ticket print
src/app/login, /staff, /admin    Staff UIs (session-gated client-side AND server-side)
src/app/api/public/*             Create / track / customer actions (ref+email ownership)
src/app/api/auth/*               Login (throttled), logout, me, change-password
src/app/api/staff/*              Staff lists + workspace actions (role-checked)
src/app/api/admin/*              Stats + user management (ADMIN only)
src/lib/domain.js                Statuses, totals/reconciliation, validation, audit, views
src/lib/auth.js                  HMAC-signed cookie sessions, requireStaff() guard
src/lib/store.js                 Persistence adapter (see limitations)
src/lib/config.js                EDIT ME: business + payment details
src/lib/i18n.js                  English/Amharic dictionary
data/db.json                     Runtime database file (back this up!)
```

## Honest v1 limitations & next steps (in priority order)

1. **Database:** v1 ships a file-backed store (`data/db.json`) — perfect for a
   single small server/VPS (Render/Railway/Hetzner with a persistent disk,
   one instance). It is **not** suitable for multi-instance/serverless hosting
   like Vercel. All persistence goes through `src/lib/store.js`, so swapping
   to PostgreSQL (Prisma + Neon/Supabase) is a contained change — do this
   before scaling or if uptime matters.
2. **Notifications:** messaging is in-app only. Next: email (Resend/SMTP) on
   new booking/quote/ticket, and WhatsApp deep-links or WhatsApp Business API.
   Until then, agents should keep the dashboard open during office hours.
3. **Payment proof:** reference-based verification (no screenshot upload yet).
   Next: file upload to object storage, then Chapa online payments when ready.
4. **Documents:** e-ticket is a printable page (browser Print → PDF).
   Next: generated PDF invoices/receipts with TIN/VAT details.
5. **Later:** refunds/reissue workflow, ticket-deadline alerts, sales reports
   export, live flight search (Amadeus/aggregator) when volume justifies it.

## Going live checklist

- [ ] `src/lib/config.js` updated with real accounts/contacts
- [ ] `.env.local` created with a fresh secret; HTTPS in front of the app
- [ ] Demo passwords changed; demo agent deactivated; real staff created
- [ ] Data file reset (smoke booking removed)
- [ ] Daily backup of `data/` scheduled
- [ ] Old Apps Script deployment deleted/restricted (it has no auth)
- [ ] `python3 smoke_test.py` green against the production server

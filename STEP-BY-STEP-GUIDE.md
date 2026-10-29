# STEP-BY-STEP GUIDE — Bersabeh Trading Flight Ticket Webapp

**What you received:** the complete source code of your rebuilt ticket office
webapp (folder `bersabeh-app`), this guide, a `README.md`, an automatic test
script (`smoke_test.py`), and the original security evaluation report.

**How the business flows in the app:**
Customer sends a flight request → your agent sends a quote → customer accepts →
customer pays by Telebirr / CBE / bank and reports the reference → agent verifies
the payment → agent issues the real ticket in the airline portal → agent records
the PNR + ticket numbers in the app → customer sees and prints the e-ticket.

Follow the parts in order. **PART 1–4** get it running on your own computer.
**PART 5** personalises it. **PART 6** teaches the daily office work.
**PART 7** puts it on the internet. **PART 8** keeps it safe.

---

## PART 1 — What you need (install once)

1. A computer (Windows, Mac, or Linux) with internet for the first install.
2. **Node.js version 20 or newer** (this runs the app):
   - Go to **https://nodejs.org** → download the **LTS** version → install it
     (keep clicking Next / default options).
   - Check it worked: open a terminal (see below) and type `node --version`
     then Enter. You should see something like `v20.x.x` or newer.
3. A text editor for editing settings later. **VS Code** (free,
   https://code.visualstudio.com) is recommended. Windows Notepad also works.
4. (Optional, only for the automatic test) Python 3 from https://python.org.

**How to open a terminal inside the app folder (Windows):**
open the `bersabeh-app` folder in File Explorer → click the address bar → type
`cmd` → press Enter. A black window opens, already inside the right folder.
On Mac: right-click the folder → "New Terminal at Folder".

---

## PART 2 — Unzip and install

1. Unzip `bersabeh-ticket-app-v1.zip` anywhere (e.g. Desktop). You will see a
   folder called `bersabeh-app`. **All commands below are typed in a terminal
   opened inside that folder.**
2. Install the app's libraries (needs internet, ~1 minute):

   ```
   npm install
   ```

   Wait until it finishes without red ERR! messages. A `node_modules`
   folder appears — this is normal. (That is why it was not inside the ZIP:
   it is huge and is recreated by this command.)

---

## PART 3 — First run (testing mode)

1. Start the app:

   ```
   npm run dev
   ```

2. Open your browser to: **http://localhost:3000**
3. You should see the Bersabeh Trading home page. 🎉
4. To stop the app, click in the terminal and press **Ctrl + C**.

**Demo staff accounts** (created automatically the first time):

| Role  | Email                   | Password    |
|-------|-------------------------|-------------|
| Admin | admin@bersabeh.local | Admin@2026! |
| Agent | agent@bersabeh.local | Agent@2026! |

⚠️ These are public demo passwords. The app will warn you to change them —
do it in PART 5, step 3, before any real use.

---

## PART 4 — Test the full business journey (5 minutes)

Do this once to learn the system end-to-end:

1. **As a customer:** on the home page, fill the form (use your own email),
   choose a route and a future date, add the passenger name → *Send request*.
   Write down the reference shown, like `BTB-ABCD23`.
2. **As the agent:** top menu → *Staff login* → log in as the Agent → you see
   the dashboard → *New requests* tab → **Take request** → **Open workspace**.
3. Fill **Add flight**: airline, flight number (e.g. ET308), route, dates/times,
   baggage — and **Total price = the price for ALL passengers together** →
   *Add flight* → then **📨 Send quote to customer**.
4. **As the customer again:** top menu → *Track booking* → enter the reference
   + the email from step 1 → review the itinerary → **✓ Accept quote**.
   The payment instructions and accounts appear. (Pretend you paid:) enter
   method *Telebirr*, the amount, any fake reference like `TEST123` →
   **I have paid — send reference**.
5. **As the agent:** reopen the booking workspace → the payment shows as
   CLAIMED → (in real life you now check your Telebirr/CBE statement) →
   **✓ Verify & confirm**. When the full amount is confirmed, the status
   becomes **Payment confirmed**.
6. **Issue the ticket:** (in real life, ticket now in your airline/GDS portal)
   enter the airline **PNR** (e.g. `XK7P2Q`) and one **e-ticket number per
   passenger** (e.g. `071-2345678901`) → **🎫 Mark ticket issued**.
7. **As the customer:** track the booking again → the green e-ticket card with
   PNR and ticket numbers → **Print / save as PDF**.
8. Log in as **Admin** → see totals, revenue by currency, and user management.
   Try the **አማርኛ** button on the customer pages.

Optional automatic check (needs Python 3, app must be running):

```
python3 smoke_test.py
```

It replays the whole journey plus security checks and should print
19 PASS lines.

---

## PART 5 — Personalise it for your office (do before real customers)

### Step 1 — Your business & payment details
Open the file `src/lib/config.js` in your editor and change:
- phone, WhatsApp, email, address, office hours
- `paymentAccounts`: your **real Telebirr number** and **CBE account**
  (this is exactly what customers see at payment time)
- the airport list (add/remove your common routes)
Save the file. If the app is running in `npm run dev` mode, refresh the page.

### Step 2 — Security settings file
1. Make a copy of `.env.example` and name the copy **`.env.local`**
   (same folder, next to `package.json`).
2. Generate a long random secret — in the terminal type:

   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Copy the long text it prints.
3. Open `.env.local` and fill in each line after the `=` sign:
   - first line (the session secret) → paste the long random text
   - the admin email line → your real admin email
   - the admin password line → a strong password you choose (10+ characters)
   - the secure-cookie line → leave empty while testing on your own
     computer; set it to `1` later when the site is live behind HTTPS
     (Part 7).
4. Save. ⚠️ These admin details are only used when the database is created
   fresh (see "Reset everything" in Part 8). Never share `.env.local`.

### Step 3 — Real staff accounts
1. Log in as Admin → change your own password (Staff dashboard →
   *Change my password*).
2. Admin page → *Add staff user* for each real agent (give each a temporary
   password; the app forces them to change it after first login).
3. Deactivate the demo *Agent* account; later deactivate any staff who leave
   the company. Deactivation blocks access immediately.

### Step 4 — Start with a clean, empty database
The practice bookings live in one file: `data/db.json`.
To start empty for the real business: stop the app (Ctrl+C), **delete
`data/db.json`**, start the app again. It creates a fresh database using the
admin details from your `.env.local`.

---

## PART 6 — Daily office use

**Customer side (share these links):**
- Request a flight: your homepage `/`
- Track booking: `/track` (they need their reference + email)

**Agent daily routine:**
1. Log in → dashboard shows: *New unassigned*, *My active*, *My issued*.
2. *New requests* → **Take** new ones so colleagues see they are handled.
3. In the workspace: verify passenger data (call/WhatsApp the customer if
   passport details are missing — airlines need name exactly as on passport).
4. Search flights in your normal airline/GDS portal; type the chosen flight(s)
   and the total price; **Send quote**. Add a message if needed.
5. When the customer reports payment, **check your real Telebirr/CBE/bank
   statement first**, then **Verify & confirm** (or *Record verified payment*
   for cash at the office). Part-payments are tracked; the balance must reach
   zero before ticketing.
6. Ticket in the portal → record **PNR + every ticket number** → the customer
   can immediately see/print their e-ticket on the tracking page.
7. Use *Messages*: "To customer" messages are visible to the customer;
   "Internal note" is staff-only. Every action is kept in the **Audit trail**.

**Admin routine:** review the Admin dashboard (bookings by status, confirmed
revenue per currency, payments waiting verification), manage staff accounts,
reassign bookings by opening them and using admin actions.

**Rules the system enforces for you:** a ticket cannot be marked issued before
payment is fully confirmed; flights cannot be added before an agent takes the
booking; one agent cannot quietly take over another agent's booking; customers
can only see their own booking with reference + email.

---

## PART 7 — Put it on the internet (choose ONE option)

> Localhost (Parts 1–4) only works on your own computer. For customers to use
> it, host it on a small server that stays on. Because v1 stores data in
> `data/db.json`, you need hosting with a **persistent disk** and **one running
> instance**. Do NOT deploy v1 to Vercel/serverless — the data file would not
> persist between visits. (Ask your developer to move `src/lib/store.js` to
> PostgreSQL later if you outgrow this.)

### Option A (easiest) — Render.com
1. Create a free account at https://render.com and a GitHub account.
2. Upload the `bersabeh-app` folder contents to a new GitHub repository
   (do not upload `node_modules` or `data/db.json` — the included
   `.gitignore` already excludes them if you use Git).
3. Render → *New → Web Service* → connect the repository.
4. Settings: Build command `npm install && npm run build`, Start command
   `npm start`.
5. Add a **Persistent Disk** (paid add-on, small is fine) mounted at a path,
   and keep the instance count at 1. Put the app so its `data` folder lives
   on that disk, or ask support/your developer to point the working directory
   at the disk. Without the disk, your bookings vanish on every restart.
6. In *Environment*, add the same variables as your `.env.local`
   (session secret, admin email/password, secure-cookie `1`).
7. Deploy. Render gives you an `https://…onrender.com` address; you can
   attach your own domain (e.g. `book.example.com`) in Settings.

### Option B — Your own office/server computer or VPS (advanced)
On an always-on Linux VPS (e.g. Hetzner/DigitalOcean):
1. Install Node.js 20, copy the folder, run `npm install` and `npm run build`.
2. Start it permanently with PM2: `npm install -g pm2`, then
   `pm2 start "npm start" --name bersabeh`, then `pm2 save` and `pm2 startup`.
3. Point a domain at the server, and put Nginx + a free Let's Encrypt
   certificate in front for HTTPS; proxy to port 3000.
4. Set the secure-cookie variable to `1` once HTTPS works.

### After going live (either option)
- Log in, change all passwords, create real agents (Part 5 step 3).
- Delete practice bookings by resetting `data/db.json` (Part 5 step 4).
- Run the PART 4 journey once on the live address with a tiny test booking.
- **Delete/restrict the OLD Google Apps Script deployment** — it has no real
  login protection (see the included evaluation report).
- Share the public link on your WhatsApp/business pages.

---

## PART 8 — Backups, safety & troubleshooting

**Backups (important!):** all bookings/users live in `data/db.json`.
Copy this file somewhere safe **every day** the office trades (USB, Google
Drive, email to yourself). To restore: stop the app, replace `data/db.json`
with the backup copy, start the app.

**Safety checklist:**
- [ ] Demo passwords changed; demo Agent deactivated
- [ ] `.env.local` filled and kept private
- [ ] Site served over HTTPS and secure-cookie enabled
- [ ] Only current staff have active accounts
- [ ] Daily `data/db.json` backup habit in place
- [ ] Old Apps Script app retired

**Troubleshooting:**

| Problem | Fix |
|---|---|
| `node is not recognized` | Node.js not installed (Part 1). Install LTS, then open a NEW terminal. |
| `npm install` fails | Check internet; run it again. In China/slow networks it may need a second try. |
| Port 3000 already in use | Another copy is running — close its terminal, or run on another port: edit `package.json` scripts (`-p 3000` → `-p 3001`) and open localhost:3001. |
| Page won't load | Make sure the terminal still shows the app running and you used http://localhost:3000 |
| Login says invalid | Passwords are case-sensitive. Demo logins are in Part 3. If you reset the database, the admin is whatever you put in `.env.local`. |
| Forgot the only admin password | Stop app → delete `data/db.json` → set new admin details in `.env.local` → start app. ⚠️ This also deletes bookings — restore from backup if you have real data and ask a developer instead. |
| Customer says "Booking not found" | They must type the exact reference (e.g. BTB-XXXXXX) and the SAME email used on the request form. |
| Changes to `config.js` don't appear | In production mode run `npm run build` again and restart; in dev mode just refresh. |
| Database read failed error | `data/db.json` was edited badly or corrupted — restore the latest backup copy. Never edit it by hand while the app runs. |

**Useful commands (inside `bersabeh-app`):**

```
npm run dev        start in testing/dev mode
npm run build      build the fast production version
npm start          start the production version (after build)
python3 smoke_test.py   run the 19-point automatic test (app must be running)
```

## What to upgrade later (tell your developer, in this order)
1. PostgreSQL database (replace `src/lib/store.js`) → then any host, including Vercel.
2. Email + WhatsApp notifications (new booking alerts to agents; quote/ticket to customers).
3. Payment screenshot upload; later Chapa online payments.
4. PDF invoices/receipts; refund/reissue workflow; deadline reminders.

---
*Files in this package: full source (`src/`), `package.json` +
`package-lock.json` (exact library versions), `.env.example`, `README.md`
(technical reference), `smoke_test.py`, this guide, and the security
evaluation of the old system. Your runtime data (`data/db.json`) and
`node_modules` are intentionally not shipped — they are created on first run
by `npm install` and first launch.*

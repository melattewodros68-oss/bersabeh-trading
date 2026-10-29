# DEPLOY FREE — Stage 2: GitHub + Neon (free DB) + Render (free hosting)

Goal: a permanent public address like `https://bersabeh-booking.onrender.com`,
bookings stored safely in PostgreSQL, **total cost $0**. Known free-tier
trade-off: the Render server sleeps after ~15 idle minutes; the next visitor
waits about a minute while it wakes. Your data in Neon never sleeps away.

You need: an email address you control. No payment card for GitHub or Neon.
(If Render ever asks for a card to verify the account, stop and ask for the
alternative plan — do not pay for anything in this guide.)

---

## STEP A — Create the 3 free accounts

### A1. GitHub (stores your code)
1. Go to **https://github.com** → **Sign up**.
2. Email → create a password → choose a username (e.g. `bersabeh-trading`).
3. Verify the email code GitHub sends you. Skip/personalise-later any extras. Choose the **Free** plan.

### A2. Neon (your free PostgreSQL database)
1. Go to **https://neon.tech** → **Sign up** (you can use "Continue with GitHub").
2. **Create project**: name it `bersabeh`. Region: choose the closest European
   one offered (e.g. *EU Central / Frankfurt*). Create.
3. Neon shows a **Connection string** (it starts with `postgresql://` and ends
   with `neon.tech/...`). Use the **Pooled connection** version if offered.
4. Copy it into a private Notepad file labelled *NEON — DO NOT SHARE*.
   🔒 It contains your database password. Never paste it in chat, WhatsApp, or
   GitHub files. You will paste it exactly once, into Render (Step C).

### A3. Render (your free host)
1. Go to **https://render.com** → **Get Started** → **Sign up with GitHub** (easiest).
2. Authorise Render when GitHub asks.

✅ Reply **"accounts ready"** to your assistant at this point if you are being
guided live. Keep the Neon string in Notepad only.

---

## STEP B — Upload the code to GitHub

1. First, personalise on your computer: in THIS v1.1 folder open
   `src/lib/config.js` and put your real Telebirr/CBE/phone/email. Save.
2. GitHub (logged in) → top-right **+** → **New repository**.
   - Repository name: `bersabeh-app`
   - Visibility: **Private** → **Create repository**
3. On the new repo page click **uploading an existing file**.
4. Open your extracted v1.1 folder in File Explorer. Select **everything inside
   it** (Ctrl+A) and drag it onto the GitHub upload page.
   - ⚠️ If you ran `npm install` in this folder first, do NOT drag
     `node_modules` or `.next`. Upload from a freshly-extracted copy instead.
   - Never upload `.env.local` (it is not in this package — keep it local).
   - `package.json` must end up directly in the repository root (visible on
     the repo home page next to `src` and `render.yaml`).
5. Scroll down → **Commit changes**.
6. Confirm on the repo page you can see: `package.json`, `render.yaml`, `src/`.

## STEP C — Deploy on Render (Blueprint reads render.yaml)

1. Render dashboard → **New +** → **Blueprint**.
2. Connect/select the `bersabeh-app` repository (grant access if asked —
   you can limit it to only this repository).
3. Render reads `render.yaml` and proposes the free web service
   **bersabeh-booking**. If that name is taken globally, change it slightly
   (e.g. `bersabeh-booking-et`) — your address becomes
   `https://<that-name>.onrender.com`.
4. When asked for environment values (the ones marked "sync: false"):
   - the database URL → paste your Neon connection string from Notepad
   - the seed admin email → your real office admin email
   - the seed admin password → invent a strong one (10+ characters) and
     write it in your private Notepad. This becomes the FIRST admin login;
     the app forces a password change after login.
   - The session secret is auto-generated; the secure cookie is preset.
5. **Apply / Create**. First build takes ~5–10 minutes. Watch for **Live** ✅.
6. Click the `onrender.com` address. First load may take ~1 minute (waking).

*If the Blueprint screen is confusing, the manual equivalent is: New → Web
Service → repo → Runtime: Node, Build: `npm install && npm run build`,
Start: `npm start`, Instance type: Free, then add the same environment
variables under Environment.*

## STEP D — First login & go-live checks

1. Open your live address → Staff login with the seed admin email/password
   from Step C → change the password when warned.
2. Admin → create each real agent (temporary passwords; they must change on
   first login). Note: v1.1 on PostgreSQL does **not** seed any demo agent,
   and the login page no longer displays demo passwords.
3. Run one full test journey on the live site (request → quote → accept →
   payment claim → verify → issue with test PNR), then cancel/delete practice
   by marking the test booking Cancelled with reason "test".
4. Test on your phone (mobile data). Expect a slow first load if the service
   was sleeping — refresh once.
5. Retire the old Google Apps Script deployment now.
6. Share the live link (WhatsApp, shop window QR, business cards).

## Backups (PostgreSQL mode)
Weekly: Neon console → your project → **SQL Editor** → run:

```
SELECT value FROM app_state WHERE key = 'main';
```

Copy/download the result and save it with the date (e.g. `backup-2026-11-05.json`).
That single JSON contains all users and bookings. (Restore is a developer
task: insert it back into the same table.)

## Updating the site later
Edit files in GitHub (open file → pencil icon) or upload changed files the
same way as Step B → Render auto-deploys on every commit. Config changes in
`src/lib/config.js` work the same way.

## Troubleshooting
| Problem | Fix |
|---|---|
| Build fails: `package.json not found` | Repo layout is nested (package.json inside an extra folder). It must be at repo root — redo Step B dragging folder *contents*. Or in Render service Settings set Root Directory to that subfolder. |
| App loads but every action errors / Database read failed | Database URL missing/wrong in Render Environment. Re-paste the Neon pooled string exactly; save → redeploy. |
| Login fails on live site | You are using v1 demo passwords. Live admin = the seed email/password you set in Step C. Agents must be created by the admin in v1.1. |
| First visit spins ~1 minute | Normal free-tier wake-up. Refresh after a minute. |
| I need it awake in office hours | Optional: a free pinger (e.g. cron-job.org) hitting your URL every 10 min 08:00–18:00 keeps it warm during work; let it sleep at night. Free hours are finite — check Render's current free limits. |
| I pasted the Neon string somewhere public | Rotate it immediately: Neon → project → Roles/Connection → reset password, then update Render Environment and redeploy. |

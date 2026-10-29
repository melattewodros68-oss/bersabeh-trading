# UPDATE TO v1.3 — Real airplane logo, bigger brand, developer credit

**What changes (visual only + footer credit):**
- The ✈️ emoji next to *Bersabeh Trading* is replaced by a real airplane logo
  image (`public/logo-plane.jpg`) — in the header, staff login, footer, and as
  the browser-tab icon (favicon).
- **Bersabeh Trading** wordmark is much bigger (header 1.95rem, footer 1.5rem,
  responsive on mobile).
- Footer gains a **LuBella Technology** credit column on every page:
  "Need a web app like this? Developed by LuBella Technology — We build
  booking, shop & business web apps." with clickable WhatsApp (opens a chat
  with a pre-filled enquiry), Call, Email and Telegram links, plus a
  "Website by LuBella Technology" bottom line. Edit contacts later in
  `src/lib/developer.js`.
- No database, booking, or settings changes. Same tests: build + 19/19 smoke.

## ⚠️ Protect your real payment details (same as v1.2 update)
Your GitHub repo has YOUR edited `src/lib/config.js` (real Telebirr/CBE/phone);
the fresh copy has placeholders. **Delete `src\lib\config.js` from the
extracted v1.3 folder before uploading** — GitHub only overwrites files you
upload, so yours stays safe. (Forgot? Pencil-edit the file on GitHub after
deploy to put the real numbers back; Render redeploys automatically.)

## Update steps (≈10 minutes)
1. Extract `bersabeh-ticket-app-v1.3.zip` fresh.
2. Delete `src\lib\config.js` from that extracted copy (see above).
3. GitHub repo → **Add file → Upload files** → in File Explorer open the
   extracted folder → **Ctrl+A** → drag EVERYTHING in. Make sure the upload
   includes **`public/logo-plane.jpg`** and **`src/lib/developer.js`**
   (both are required — the layout imports the credit data, the header/login
   show the logo). No `node_modules`/`.next` (a fresh extract has neither).
4. Commit message: `v1.3 real plane logo + LuBella credit` → **Commit changes**.
5. Render auto-deploys → wait for **Live** → open the site → **Ctrl+F5**.
6. Verify:
   - Header & login show the real white-jet logo and a bigger Bersabeh Trading.
   - Browser tab shows the plane icon.
   - Footer shows the LuBella Technology box; tap WhatsApp (chat opens to
     +251 967 942 524 with a pre-filled message), Telegram (@sintayehu12121),
     email (lubella1018@gmail.com).
   - Payment stage still shows your real Telebirr/CBE numbers.
7. Rollback if needed: Render → service → Deploys → previous deploy → Rollback.

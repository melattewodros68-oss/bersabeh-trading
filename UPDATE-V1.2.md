# UPDATE TO v1.2 — New Ethiopian layout + Change Email

**What changes:** full visual redesign (green/gold/red Ethiopian theme, new hero
with photo, "How it works" + popular-destination chips, refreshed staff/admin
screens) and a new **Change email** button in Admin → Staff users.
**What does NOT change:** your Neon database, all bookings/users, Render
settings, and your web address. The update is code-only.

## ⚠️ Protect your real payment details first
Your GitHub repo currently contains YOUR edited `src/lib/config.js`
(real Telebirr/CBE/phone). The fresh v1.2 copy contains placeholder values.
**Before uploading, delete the file `src\lib\config.js` from your extracted
v1.2 folder.** GitHub only overwrites files you actually upload, so your
edited version in the repo stays untouched.
(If you forget: after deploying, open the file on GitHub with the pencil
icon and re-enter your real details — Render will redeploy automatically.)

## Update steps (≈10 minutes)
1. Extract `bersabeh-ticket-app-v1.2.zip` (fresh folder; `package.json` is at its top level).
2. In that folder, **delete `src\lib\config.js`** (see warning above).
3. GitHub → open your repo (e.g. `melattewodros68-oss/bersabeh-trading`)
   → **Add file** → **Upload files**.
4. In File Explorer open the extracted v1.2 folder → **Ctrl+A** → drag
   EVERYTHING (including the new `public` folder with `hero.jpg`) onto GitHub.
   Do not drag `node_modules` / `.next` if present (a fresh extract has neither).
5. Commit message box: type `v1.2 redesign + change email` → **Commit changes**.
6. Render auto-deploys on the new commit (Dashboard → your service to watch).
   Wait for **Live**, then open your site and press **Ctrl+F5** (hard refresh)
   so your browser drops the old styles.
7. Verify: new hero/flag stripes on the home page, then log in as Admin →
   Staff users → each row now has a **Change email** button.

## Handing the app email to your friend (new way)
Admin → Staff users → **Change email** on your own admin row → enter your
friend's email. The same account (and all bookings assigned to it) now log in
with the new email; the password stays the same until they change it
(recommended: friend changes password immediately after handover).
Old email stops working instantly — this was tested.

## If anything looks wrong after deploy
Render → your service → **Events/Deploys**: you can roll back to the previous
deploy in one click, then ask for help. Also check the change didn't overwrite
`config.js` (payment numbers on the live payment stage are the tell).

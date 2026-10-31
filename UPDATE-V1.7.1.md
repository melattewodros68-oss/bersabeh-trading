# UPDATE V1.7.1 — remove “Faster booking — approve now” section

Use this package **instead of v1.7**. It contains the v1.7 guided live-page
update, with one requested change.

## What changed from v1.7

- Removed the complete customer form section:
  **4 — ⚡ Faster booking — approve now (optional)**
- The request form now goes:
  1. Your contact details
  2. Trip details
  3. Passengers
  - then Notes and Send request (there is no section 4)
- New requests no longer ask the customer for a maximum approved total.
- The customer reviews the agent's quote on the private live booking page
  and presses **Accept quote** before payment.
- The “How it works” wording was updated so it no longer mentions advance
  approval.
- PWA service worker bumped to `bersabeh-v1.7.1-1`.

Everything else from v1.7 remains: private live booking link, automatic page
updates, next-step guidance, exact-amount/account copy buttons, payment
reference entry on the same page, and PNR/e-ticket display with print/share
actions. Existing bookings remain compatible.

## Verification

- Production build: PASS.
- Local API check confirmed a request submitted without the removed section
  is saved as a normal quote-review request and still receives a private
  live-page token.
- Mobile browser check confirmed the removed heading/text is absent and the
  Notes field follows Passengers.

## Deploy

1. Extract `bersabeh-ticket-app-v1.7.1.zip` into a fresh folder.
2. **Delete `src\lib\config.js` from the extracted copy before uploading**
   so the real Telebirr/CBE details already saved in GitHub are preserved.
3. GitHub repository -> **Add file -> Upload files** -> select everything
   remaining (Ctrl+A) and upload it.
4. Commit with: `v1.7.1 remove approve-now section`.
5. Wait for Render to show **Live**, then open the site and press
   **Ctrl+F5** or tap the app's **↻ Refresh** button.
6. Check that the request form has no “Faster booking — approve now” section
   and that the real payment details are still shown after a quote is
   accepted.

No Neon, database or Render environment changes are needed.
Rollback if needed: Render -> Deploys -> previous deploy -> Rollback.

# UPDATE V1.7 — guided one-page booking flow

## What changed

The customer no longer has to keep returning to the Track page and typing
the booking reference + email at every stage.

After the request form is submitted, the customer gets **one private live
booking page**. The quote, payment instructions, payment-reference form,
messages and final e-ticket all appear on that same page.

The customer can also use the new optional **Approve now** section on the
first form. If the agent later finds a flight that safely matches that
approval, the separate **Accept quote** step is skipped and the page moves
straight to payment.

## New customer journey

1. Customer completes the request form once.
2. Optionally, the customer chooses **Approve now** and gives:
   - maximum total for all passengers;
   - currency;
   - exact dates, ±1 day, or ±3 days;
   - direct/non-stop only, if wanted.
3. The success screen opens the customer's private live booking page.
4. The page shows a clear **Your next step** box and refreshes itself every
   30 seconds while the office is working.
5. The customer can save the page link, copy it, use the phone Share button,
   or send it to themselves with WhatsApp.
6. If the quote matches the approval, payment opens automatically.
7. The exact amount due is pre-filled. The customer can copy the amount and
   payment-account number, pay by Telebirr/CBE/bank on the phone, then enter
   the transaction reference on the same page.
8. After staff verify payment and issue the ticket in the airline/GDS
   system, the PNR and e-ticket numbers appear on the same page with Print,
   Copy, Share and WhatsApp actions.

**Approve now does not take money.** It is only the customer's advance
permission for a matching quote to skip the later Accept tap. The customer
still pays manually and can still choose not to pay.

## When the Accept step is skipped

The app checks the quote when the agent presses **Send quote**. It skips
Accept only when **every** check passes:

- customer chose Approve now;
- quote total is not above the approved maximum;
- quote uses the approved currency only;
- outbound route matches the requested airport codes;
- for a return trip, the return flight is listed separately and flies back
  from the requested destination to the requested origin;
- departure and return dates are inside the approved flexibility;
- direct-only approval is not broken by a stopover entry;
- travel class matches the request.

If anything is missing, different, or cannot be verified, the booking stays
at **Quoted — your action needed** and the customer must press Accept or
Reject. The reasons are shown to the customer and in the staff workspace.

## Agent notes

- New pre-approved requests are marked **⚡ Pre-approved** in the staff queue.
- The booking workspace shows the customer's maximum, date flexibility and
  direct-only choice.
- For a return trip, add the outbound and return flights as **two separate
  flight records** so the return date and route can be checked.
- Use the airport list values containing codes, for example
  `ADD — Addis Ababa Bole (ADD)` and `DXB — Dubai (DXB)`.
- Keep the quote in one currency, enter the real travel class, and enter the
  stopover field honestly (`Direct`, `Non-stop`, or the stopover details).
- After **Send quote**, the workspace shows whether the last check matched
  or lists why it did not.
- The workspace also has a **Customer live booking page** panel with Copy
  link and **WhatsApp link to customer** buttons.
- If a link was sent to the wrong person, use **New link (old one stops
  working)**, then send the customer the new link.

## What v1.7 does not automate

- It does not search live airline/GDS prices.
- It does not collect card or Telebirr payments automatically.
- Staff still verify the customer's payment reference manually.
- Staff still issue the ticket in the airline/GDS portal and enter the PNR
  and e-ticket numbers in the app.
- It does not send automatic SMS, email or WhatsApp notifications. The
  customer saves the private link, and staff can WhatsApp that link manually
  from the booking workspace.

## Private-link safety

Treat the live link like a password for that one booking. Anyone who has it
can open the booking, read its details and ticket numbers, send messages,
approve/reject a quote, and submit a payment reference. Do not post it
publicly. The old reference + email Track method still works as a fallback,
and opening a booking that way creates/returns its live link.

## Verification performed

- Production build: **PASS**.
- Guided-flow API test: **21/21 PASS**, including:
  - matching ETB 45,000 quote under a 50,000 maximum moving directly to
    Awaiting payment;
  - token-only payment claim, staff confirmation and ticket visibility;
  - over-maximum quote staying at Quoted;
  - bad-token rejection, reference + email fallback, and link rotation.
- Existing full smoke regression: **19/19 PASS**.
- Mobile browser test at 390 × 844: **8/8 PASS**, including the Approve-now
  form, token-only payment page with the amount pre-filled, copy-link
  feedback, issued-ticket actions, staff approval/WhatsApp panel, no fatal
  browser errors, and no horizontal overflow.
- All tests used local fake bookings and local placeholder payment details.
  No live booking or live payment was created.

## Deploy (about 10 minutes)

1. Extract `bersabeh-ticket-app-v1.7.zip` into a fresh folder.
2. **Delete `src\lib\config.js` from the extracted copy before uploading.**
   This protects the real Telebirr/CBE payment details already saved in
   GitHub. Do not skip this step.
3. In the GitHub repository, choose **Add file -> Upload files**. Select
   everything in the extracted folder (Ctrl+A) and drag it in. The upload
   must include these changed files:
   - `public/sw.js`
   - `src/app/api/public/action/route.js`
   - `src/app/api/public/bookings/route.js`
   - `src/app/api/public/track/route.js`
   - `src/app/api/staff/bookings/[id]/action/route.js`
   - `src/app/globals.css`
   - `src/app/page.js`
   - `src/app/staff/bookings/[id]/page.js`
   - `src/app/staff/page.js`
   - `src/app/track/page.js`
   - `src/lib/domain.js`
   - `src/lib/i18n.js`
   - `UPDATE-V1.7.md`
4. Commit with message: `v1.7 guided one-page booking flow`.
5. Wait until Render shows **Live**. Then open the site and press
   **Ctrl+F5** once on a computer, or use the app's **↻ Refresh** button on a
   phone. The PWA service worker version is now `bersabeh-v1.7-1`; there is
   no need to uninstall/reinstall the installed app.

Database, Neon and Render environment variables: **no changes**. Existing
bookings remain compatible; a live link is created when the customer opens
the booking by reference + email, or when staff create/send one from the
workspace or send a quote.

## Check after deployment

Use an internal test request with your own email/phone and a future date:

1. On the request form, confirm the **Faster booking — approve now** section
   appears. Approve a maximum total and submit.
2. Press **Open my live booking page**. It should open immediately without
   asking for the reference and email again.
3. In the staff queue, confirm the request shows **⚡ Pre-approved**.
4. Open the workspace. Confirm the approval panel and customer live-link
   panel are visible. Assign the booking to yourself.
5. Add outbound and return flights separately using airport entries with
   codes, the requested dates/class, one currency, and a combined total at
   or below the test maximum. Press **Send quote**.
6. The booking should move straight to **Awaiting payment**, and the
   workspace should say the quote matched and was auto-approved.
7. Open the customer live page. Confirm it shows the exact amount and your
   real Telebirr/CBE details from GitHub. **Do not send real money for the
   test.** Cancel the test booking from the staff workspace afterwards.
8. Optional safety check: repeat with a quote above the maximum. It must
   stay at **Quoted — your action needed** and show why it did not match.
9. Confirm an older/existing booking still opens with reference + email.

Rollback if needed: Render -> Deploys -> previous deploy -> **Rollback**.

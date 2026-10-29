# Phase S3 manual tests: Sales & Bills

This checklist is for the owner, to test recording, confirming and billing Sales payments on **dev**. Tick each box and note anything wrong next to it.

## 0. Setup (dev only)

- [ ] Backend `.env`: the `cluster0.an3ngc3` (dev) `MONGODB_URI` line is active and the production line is commented out. Restart the backend from `feature/admin-crm`.
- [ ] Admin panel running from `feature/admin-crm` against `http://localhost:5000`.
- [ ] Demo data seeded. In `Backend/noteswift-backend`, with the dev URI only in your shell:
  ```
  CRM_DEMO_MONGODB_URI='<dev uri>' npx ts-node -r tsconfig-paths/register src/scripts/seedCrmDemoData.ts --seed
  ```
- [ ] **Logins.** Use a separate browser profile or private window per role. Demo staff log in with their email, password `CrmDemo#2026`, and the code from the tech.noteswift inbox.
  - **Super Admin:** you.
  - **Admin:** Sita (`tech.noteswift+crm-admin1@gmail.com`) and Hari (`+crm-admin2`).
  - **Sales:** Rita (`+crm-sales1`) and Bikash (`+crm-sales2`).
- [ ] **A lead to record on.** Rita owns Bibek (abandoned checkout on course B) and Ishan / Hema / Gopal; any of her leads that is a registered student and has an **open** course opportunity on a paid course works. If none is left open (earlier tests may have closed them), use Rita's lead → Courses → Add course opportunity on course C.
- [ ] **An approved quote** for the promo-code tests:
  1. As Rita, on the lead → Quotes & payments → New quote → A promo code `DEMO15`. It waits for approval.
  2. As Sita, Sales Team → Discounts waiting for approval → Approve.
- [ ] **Screenshot tests need a private R2 bucket** (no public access). Without one, uploads are refused with "Screenshot upload isn't set up yet…", which is also worth checking (test 1d). To set one up on dev:
  1. In Cloudflare R2, create a bucket (e.g. `noteswift-private-dev`) and leave public access **off**: no r2.dev URL and no custom domain.
  2. Make sure the existing `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` token can read and write it.
  3. Add `R2_PRIVATE_BUCKET_NAME=noteswift-private-dev` to the dev backend `.env` and restart.
- [ ] Student apps for test 11:
  - web on branch `feat/offline-method-labels`;
  - mobile on branch `feat/offline-method-labels` (your build);
  - logged in as the student of the lead you record on. For your own student account, Rita owns it in the demo data.
- [ ] Phone width: Chrome DevTools device toolbar at 390 × 844.

## 1. Record payment (Sales: Rita)

| ✓ | # | Steps | Expected |
|---|---|---|---|
| [ ] | 1a | Lead → header "Record payment" → course → Paid by Cash → today → note → Record payment | Toast "Payment recorded". The price block showed the list price, VAT split and "From the list price". Quotes & payments → Payments: a row "Recorded by salesperson · Cash", amount visible, amber "Waiting confirmation", Bill button. The opportunity moves to Payment pending. |
| [ ] | 1b | On a lead with the approved DEMO15 quote: Record payment → eSewa → Transaction ID `TEST-ESW-001` | The price shows the promo code line, "From the approved quote" and the discounted total. Recorded at that total. |
| [ ] | 1c | With the private bucket set: Bank transfer, no transaction ID, attach a PNG under 5 MB | Recorded; the bill shows "View screenshot", which opens the image in a new tab. Its link stops working after 5 minutes. |
| [ ] | 1d | Without the bucket: Bank transfer, attach a PNG, no transaction ID | Error "Screenshot upload isn't set up yet. Enter the transaction ID instead."; nothing recorded. |
| [ ] | 1e | Attach a 6 MB file, or a .txt renamed .png | Refused in the browser (size or type); renamed files are also refused by the server. |
| [ ] | 1f | Pick eSewa with no transaction ID and no screenshot | "Record payment" stays disabled. |
| [ ] | 1g | Received date: try 8 days ago, or tomorrow | The date picker doesn't allow it. The button stays disabled if typed in. |
| [ ] | 1h | Open Record payment, fill it, double-click "Record payment" quickly (or click again while it's busy) | Exactly **one** payment row is created. |
| [ ] | 1i | Second lead and opportunity: Record with Transaction ID `test esw 001` (same as 1b, different spacing and case) | Refused: "This payment reference has already been used for another payment". It doesn't say whose. |

## 2. When Record payment is blocked (Sales)

| ✓ | Case | Steps | Expected |
|---|---|---|---|
| [ ] | Prospect | Open a prospect lead (e.g. Kabita) | Header "Record payment" disabled (tooltip); Quotes & payments shows "Payments can be recorded only for a registered student." |
| [ ] | Pending already | The lead from 1a (its only open course) | Disabled with "A payment on this opportunity is already waiting for confirmation". |
| [ ] | Already enrolled | A lead whose open course the student already has | Disabled with "The student already has this course". |
| [ ] | No open opportunity | A lead with all opportunities closed | Disabled with "No open course opportunity." |
| [ ] | Not Sales | Log in as Sita or Super Admin and open any lead | No "Record payment" button at all. |

## 3. Sales & Bills page

| ✓ | Role | Steps | Expected |
|---|---|---|---|
| [ ] | All | Sidebar → Sales & CRM | "Sales & Bills" sits after Follow-ups & Tasks. |
| [ ] | Rita | Open Sales & Bills | Subtitle "Your sales and their bills."; default tab **All**. Tiles "My confirmed sales" and "Waiting confirmation", each with what it includes. Only Rita's payments; no Salesperson column or filter. |
| [ ] | Sita | Open Sales & Bills | Subtitle "Every sale your team made, and its bill."; default tab **Waiting confirmation**. Tiles "Team credited sales", "Waiting confirmation", "Rejected", and **no** company total. Rows from every rep, online payments, offline sales, and "Organization" bulk batches. No Rs 0 grants. |
| [ ] | Super Admin | Open Sales & Bills | Same as Sita, plus a "Company sales in this list" tile. |
| [ ] | Sita | Tab counts | Each tab's count equals the rows you see in it. Counts change with the filters. |
| [ ] | Sita | Filters: Salesperson = Rita; Method = Cash; How = Recorded by salesperson; a date range | The list, counts and tiles all narrow together. A date range covers whole days in Nepal time. |
| [ ] | Sita | Search a receipt number (NS-RCP-…) and then a student's name | The matching rows. |
| [ ] | Sita | Columns | Receipt no. ("—" until confirmed) · Date · Student (a link to the lead) · Course · How (with method) · Amount (with "incl. VAT Rs X" and the discount) · Salesperson · Status pill (Waiting amber, Confirmed green, Rejected red, Cancelled grey, Invalid red) · Bill / Confirm / Reject. |

## 4. Confirm (Admin)

| ✓ | Role | Steps | Expected |
|---|---|---|---|
| [ ] | Sita | Waiting tab → Confirm on Rita's 1a payment | The dialog shows amount, method, reference, received date, recorder and (if any) "View screenshot". "Confirm payment" is disabled until the box "I checked the money arrived in the company account" is ticked. |
| [ ] | Sita | Tick → Confirm payment | Toast "Payment confirmed". The row moves to Confirmed with a receipt number. The Waiting badge goes down after navigating. |
| [ ] | Super Admin | Before confirming 1b: change course B's price (Courses), then try to confirm | Error "The price changed or the promo code is no longer valid. Reject this payment and ask the salesperson to record it again."; the payment stays waiting. Put the price back afterwards. |
| [ ] | Rita | Look at her own waiting payment | No Confirm or Reject buttons, only Cancel. (The server also refuses a recorder confirming their own payment; this can't be clicked in the UI.) |
| [ ] | Sita + Hari | Both open Confirm on the same payment, both submit | One succeeds; the other gets "This payment is no longer waiting for confirmation". |

## 5. Reject and Cancel

| ✓ | Role | Steps | Expected |
|---|---|---|---|
| [ ] | Sita | Reject a waiting payment without a reason | Not possible. With a reason: toast "Payment rejected", Rejected tab. On the lead, the opportunity goes back from Payment pending (to Quoted if a quote is active), unless a pending course assignment keeps it at Payment pending. |
| [ ] | Rita | Her rejected payment in Sales & Bills / the lead | Shows "Rejected" and the reason. Its transaction ID can be used again on a new payment. |
| [ ] | Rita | Cancel her own waiting payment, with a reason | Toast "Payment cancelled", Cancelled tab. |
| [ ] | Bikash | Try to act on Rita's payments | They aren't in his list at all. |

## 6. Bill view per role

| ✓ | Role | Steps | Expected |
|---|---|---|---|
| [ ] | Super Admin | Bill on a confirmed Sales payment | The seller block (name, address, VAT No) and a green "Paid · Confirmed" stamp. Receipt no., date, student **and phone**. Item table (list price, discount / promo, taxable amount, VAT, total), amount in words, Paid by **with reference**, recorded / confirmed by, credited to, footer. "Download PDF". |
| [ ] | Sita | Same bill | **No phone, no reference**, no "Download PDF". "View screenshot" if there is one. |
| [ ] | Rita | Same bill (she still owns the lead) | Phone and her reference shown, plus "Download PDF". |
| [ ] | Any | Bill on a waiting payment | Amber "Pending confirmation" stamp; the receipt no. reads "Issued when confirmed"; no PDF. |
| [ ] | Any | Bill on a rejected payment | Red "Rejected" stamp and "Rejected because …". |
| [ ] | Sita, then Rita | Sita reassigns that lead from Rita to Bikash. Rita opens Sales & Bills | Rita still sees the row, but the student name isn't a link. The bill has **no phone**, still shows **her reference**, and has **no Download PDF**. Bikash doesn't see the row. |

## 7. PDF download (R46)

| ✓ | Role | Expected |
|---|---|---|
| [ ] | Super Admin | Downloads the PDF for any confirmed payment, including an online one and a Super Admin offline sale. It is the same PDF the student gets: name, phone, reference, VAT split. |
| [ ] | Rita (owns the lead) | Downloads the PDF for her confirmed payment. |
| [ ] | Rita (after a reassignment) | No Download PDF button. |
| [ ] | Sita | Never sees Download PDF. |
| [ ] | Anyone | No PDF for waiting, rejected or cancelled payments. |

## 8. Badges

- [ ] **Sita:** the red badge on "Sales & Bills" equals the **Waiting confirmation** tab count with no filters. Super Admin: same.
- [ ] **Rita:** her badge equals her own waiting payments.
- [ ] After confirming, rejecting or cancelling, then navigating to another page, the badge updates. It refreshes on navigation, not live.

## 9. The student gets the course

- [ ] After 4 (Sita confirms), the student of that lead has the course in the student app (web or mobile).
- [ ] An active trial of that course has ended.
- [ ] On the lead, a pending "Assigned, payment pending" for that course (if you made one) now shows as fulfilled.
- [ ] Within about a minute, the lead's Courses tab shows the opportunity as **Won**, and Payments shows "Sale" with credit "You" for Rita.

## 10. Lead → Quotes & payments → Payments table

- [ ] **Rita:**
  - rows she recorded show "Recorded by salesperson" with the method and an amount;
  - status pills read Waiting confirmation / Rejected (with reason) / Cancelled / completed;
  - each of her rows has a Bill button.
- [ ] **Sita:** amounts on every row; Bill buttons on Sales-recorded and qualifying rows.

## 11. Student apps (branches `feat/offline-method-labels`)

- [ ] **Web**, as the student, Payments page: the confirmed Sales payment is listed as "… · Cash" (or eSewa / Bank transfer / Other), **not** `cash` / `esewa-personal`. The detail shows the breakdown, receipt no. and reference; "Download PDF receipt" works.
- [ ] **Mobile**, Quick Access → Payments: same labels and details.
- [ ] Waiting or rejected payments do **not** appear in the student apps.

## 12. R45 from Orders → Add Offline Sale (Super Admin)

| ✓ | Steps | Expected |
|---|---|---|
| [ ] | Add Offline Sale → Payment Reference = Transaction ID → the reference of a **waiting or confirmed** Sales payment (e.g. `TEST-ESW-001`, any spacing or case) | Refused with "This payment reference has already been used for another payment". |
| [ ] | Add Offline Sale with a new reference `OFF-777`. Then Add Offline Sale again with `off 777` | The first is created as before (code shown). The second is refused. |
| [ ] | Then as Rita, Record payment with transaction ID `OFF777` | Refused (duplicate reference). |
| [ ] | Add Offline Sale with no reference, or with a screenshot | Works exactly as before. |

## 13. Phone width (390 px)

- [ ] **Sales & Bills:** no sideways page scroll. Tiles stack, the toolbar wraps, the tabs scroll sideways, and the table scrolls inside its card.
- [ ] **Dialogs:** Bill, Confirm, Reject, Cancel and Record payment fit the screen, scroll vertically if long, and their buttons stack.
- [ ] **Lead profile:** the header buttons, including Record payment, wrap.

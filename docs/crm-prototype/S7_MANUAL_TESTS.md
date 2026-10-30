# Phase S7 manual tests: Record sale, five lead categories

This checklist is for the owner, to click through on **dev** (local backend on the development database). Tick each box and note anything wrong next to it. **Never point the backend or a script at production for these tests.**

## 0. Setup (dev only)

- [ ] Backend `.env`: the dev `MONGODB_URI` line is active and the production line is commented out. Restart the backend from `feature/admin-crm`.
- [ ] Admin panel running from `feature/admin-crm` against `http://localhost:5000`.
- [ ] Demo data. In `Backend/noteswift-backend`, with the dev URI only in your shell:
  - **The demo data already exists:** `--s7` adds only the S7 cases.
    ```
    CRM_DEMO_MONGODB_URI='<dev uri>' npx ts-node -r tsconfig-paths/register src/scripts/seedCrmDemoData.ts --s7
    ```
  - **Fresh:** `--seed` (it now runs `--targets` and `--s7` too).
  - **Clean up afterwards:** `--remove`.
- [ ] **What the S7 seed adds** (it prints a summary), all of them Rita's leads:
  - **[DEMO] Kiran Enrolled:** enrolled in a course, nothing else.
  - **[DEMO] Laxmi Enrolled Interested:** enrolled in one course and has viewed another.
  - **[DEMO] Mohan Trial:** an active trial only.
  - **Free enrollment:** [DEMO] Gopal Saud (the Rs 0 grant from `--seed`).
  - **A course with a public discount:** the summary names it. If it says "none", set a discount on a dev course before section 4.
- [ ] **Discount limit:** 10% (the seed sets it). Super Admin can change it in CRM settings.
- [ ] **Logins.** One browser profile or private window per role.
  - **Super Admin:** you.
  - **Admin:** Sita (`+crm-admin1`) and Hari (`+crm-admin2`).
  - **Sales:** Rita (`+crm-sales1`) and Bikash (`+crm-sales2`).
- [ ] **Phone width:** Chrome DevTools device toolbar, 390 × 844.

## 1. Categories of the seeded leads (Sita, Leads)

The rule, first match wins: **Lost** → **Payment pending** (a sale waiting, an opportunity at payment pending, or a pending course assignment) → **Enrolled** (any active enrollment, trials excluded) → **Interested** (an open opportunity) → **New lead**.

| ✓ | Lead | Expected category | Markers / sub line |
|---|---|---|---|
| [ ] | [DEMO] Kiran Enrolled | Enrolled (green) | — |
| [ ] | [DEMO] Laxmi Enrolled Interested | Enrolled | "Interested in another course" |
| [ ] | [DEMO] Mohan Trial | New lead (blue) | "Trial" |
| [ ] | [DEMO] Gopal Saud (free course) | Enrolled | no "Paid" marker |
| [ ] | [DEMO] Ishan Pant (paid) | Enrolled | "Paid" |
| [ ] | [DEMO] Anisha Thapa (bought, interested in another course) | Enrolled | "Interested in another course", "Paid" |
| [ ] | [DEMO] Bibek Rana, [DEMO] Hema Ojha (opportunity at payment pending) | Payment pending (amber) | "Paid" (they bought before) |
| [ ] | [DEMO] Chandni Bista, [DEMO] Dipesh Joshi, [DEMO] Kabita Prospect | Interested (blue) | Kabita also "Prospect" in the Student column |
| [ ] | [DEMO] Esha Bhatt | Lost (red) | — |
| [ ] | Every row | The contact stage (New / Contact attempted / Contacted / Qualified) shows as the grey line under the pill | |

The targets seed (`--targets`) recorded two sales on Rita's leads. A lead with the **waiting** one shows Payment pending; the one with the **confirmed** sale shows Enrolled.

| ✓ | Role | Steps | Expected |
|---|---|---|---|
| [ ] | Sita | Look at the tabs | All · New lead · Interested · Payment pending · Enrolled · Lost, each with a count; "More views…" on the right with Unassigned, Today's follow-ups, Overdue, Recent course activity, Abandoned checkout and Do not contact, each with its count. |
| [ ] | Sita | Click each category tab | The rows shown (over all pages) equal the count. New lead + Interested + Payment pending + Enrolled + Lost = All. |
| [ ] | Sita | Pick a view in "More views…" | The list switches; the select stays highlighted; no category tab is underlined. |
| [ ] | Rita | Same | Only her leads; there is no Unassigned view. |
| [ ] | Sita | Open Laxmi's drawer | The header shows the Enrolled pill, "Interested in another course" and "Contact stage: …". |

## 2. Record sale: who and where

| ✓ | Role | Steps | Expected |
|---|---|---|---|
| [ ] | Rita | Open [DEMO] Laxmi (her lead with an open course) | The action row shows **Record sale** (it used to say Record payment). |
| [ ] | Rita | Open Kabita Prospect | Record sale is greyed out; hovering says "Register the student first". |
| [ ] | Rita | Open Esha (lost) | The row shows "Reopen lead" and a greyed "Record sale" with "Reopen the lead first". |
| [ ] | Sita (Admin) | Open any student lead (e.g. Dipesh, unassigned) | Record sale is there and works (section 3). |
| [ ] | Super Admin | Same | Record sale is there and works. |
| [ ] | Bikash | Open a URL of Rita's lead | "This lead doesn't exist or isn't assigned to you." |

## 3. Record sale: the panel

| ✓ | Role | Steps | Expected |
|---|---|---|---|
| [ ] | Rita | Record sale on Laxmi | The panel looks like the prototype: Course (full width), Discount (Rs), Paid by, Receipt note / Transaction ID, plus Money received on, Screenshot and Note; then "Total **Rs X**" with the VAT split in grey, the note "The sale counts after an Admin checks the payment. The student gets the course when it's confirmed.", and "Record sale" / "Cancel". |
| [ ] | Rita | Course list | First the lead's courses ("Interested in"), then the other paid courses, then "Course not confirmed yet". |
| [ ] | Rita | Paid by: Bank transfer, no transaction ID, no screenshot | "Record sale" stays disabled. With a transaction ID it's enabled. Cash needs nothing. |
| [ ] | Rita | Record (cash) | Toast "Sale recorded"; the lead becomes **Payment pending**; the Sales section shows the row "Waiting confirmation". |
| [ ] | Rita | Record sale again for the same course | The panel says "A sale on this course is already waiting for confirmation" and Record sale stays disabled. |
| [ ] | Rita | Record sale for a course the lead has **no** opportunity for (pick it under "Other courses") | Recorded; under Courses a new opportunity for that course appears at Payment pending. |
| [ ] | Rita | Pick a course the student already has | "The student already has this course"; can't record. |
| [ ] | Rita | Double-click "Record sale" quickly | Only one sale and one opportunity appear. |

## 4. Discount

| ✓ | Role | Steps | Expected |
|---|---|---|---|
| [ ] | Rita | Pick the course with a public discount | Discount (Rs) is prefilled with its public discount; the total is the price minus it. |
| [ ] | Rita | Discount = 10% of the price (e.g. Rs 400 on Rs 4,000) | No amber pill. |
| [ ] | Rita | Discount just above 10% (Rs 401) | The amber pill "10% discount · needs approval" appears (rounded %). |
| [ ] | Rita | Discount = the full price, or negative, or 12.5 | "The discount must be a whole number of rupees from 0 to less than the price"; can't record. |
| [ ] | Rita | Record with Rs 1,000 off a Rs 4,000 course | Recorded at Rs 3,000. |
| [ ] | Sita | Sales & Bills → Waiting | The row's amount shows "−Rs 1,000 disc. · needs approval" in amber. |
| [ ] | Sita | Confirm | The dialog shows the discount in amber and "Needs approval: confirming approves this discount". After confirming, the bill's discount line says "approved". |

## 5. "Course not confirmed yet"

| ✓ | Role | Steps | Expected |
|---|---|---|---|
| [ ] | Rita | Record sale → Course "Course not confirmed yet" | The Discount field is replaced by "Amount received (Rs)". Total shows that amount and "the course is set before it can be confirmed". |
| [ ] | Rita | Record Rs 4,500 | The lead becomes Payment pending; Sales & Bills shows the amber pill "Course not confirmed". |
| [ ] | Sita | Confirm | The dialog shows "Course not confirmed" and a "Set the course" panel; Confirm stays disabled. |
| [ ] | Sita | Set a course whose total is **not** Rs 4,500 | Toast "The amount received doesn't match the course's total"; the dialog shows the amount received in red and "Rs 4,500 was received but the course's total is Rs …"; Confirm stays disabled; a "Change the course" panel stays. |
| [ ] | Sita | Change the discount so the total is Rs 4,500 (or pick a Rs 4,500 course), Set course | No red text; Confirm is enabled. Tick, Confirm: the student gets the course. |
| [ ] | Rita | (Optional, by API) `PATCH /api/admin/crm/payments/<id>/course` on her own pending sale | Allowed (the recorder). Bikash gets 404. |

## 6. Confirmation and credit

| ✓ | Role | Steps | Expected |
|---|---|---|---|
| [ ] | Sita | Record a sale on one of Rita's leads, then open Sales & Bills | "Recorded by: Sita", "Credit to: Demo Sales Rita". |
| [ ] | Sita | Try to confirm her own sale | No Confirm / Reject button on her own row (the API answers 403 "another approver must"). |
| [ ] | Hari (Admin) | Confirm Sita's sale | Confirmed; the student has the course; Team & Targets credits **Rita**. |
| [ ] | Rita | Sales & Bills | She sees Sita's sale on her lead, waiting and then confirmed. |
| [ ] | Super Admin | Record a sale on Dipesh (unassigned), Sita confirms | "Credit to: No salesperson"; nobody's target changes. |
| [ ] | Sita | Record on Rita's lead, reassign the lead to Bikash, Hari confirms | The credit stays with **Rita** (decided at recording). |
| [ ] | Sita | Reject a waiting sale with a reason | The sale is Rejected; a new opportunity it created goes back to Interested; the lead's category returns (e.g. Interested). |

## 7. The category moves

| ✓ | Role | Steps | Expected |
|---|---|---|---|
| [ ] | Rita | Open [DEMO] Mohan Trial | New lead, with "Trial". |
| [ ] | Rita | "+ Add course" on Mohan | **Interested**. |
| [ ] | Rita | Record sale for that course | **Payment pending**. |
| [ ] | Sita | Confirm it | **Enrolled**, with "Paid"; the trial marker goes (the trial is closed). |
| [ ] | Sita | Reject instead (on another lead) | Back to Interested. |

## 8. Quotes and codes are gone

| ✓ | Role | Steps | Expected |
|---|---|---|---|
| [ ] | Rita | Lead drawer | No quotes section and no "New quote". A lead that had quotes shows a collapsed "Earlier quotes (no longer used)", read-only. |
| [ ] | Rita | Course stage select / Pipeline "Move to" | No "Quoted" option (an opportunity already at Quoted still shows it). |
| [ ] | Sita | Pipeline | No Quoted column, unless an opportunity is still at Quoted. |
| [ ] | Sita | Team & Targets → Team & allocation | No "Discounts waiting for approval" card and no code allocation card. |
| [ ] | Rita | Lead drawer → ⋯ More | No "Enroll with code". (`GET /api/admin/crm/my-codes` answers 403 for her.) |
| [ ] | Super Admin | Lead drawer → ⋯ More | "Enroll with code" is still there. |

## 9. Phone width (390 px)

- [ ] **Leads:** the category tabs scroll sideways and "More views…" stays reachable; the table scrolls inside the card; the markers wrap under the pill.
- [ ] **Record sale panel:** the form becomes one column; the total line and the amber pill wrap.
- [ ] **Confirm dialog:** fits the screen and scrolls; the "Set the course" panel is usable.

# Phase S8b manual tests: Assign course and the Stage select

This checklist is for the owner, to click through on **dev** (local backend on the development database). Tick each box and note anything wrong next to it. **Never point the backend or a script at production.**

## 0. Setup (dev only)

- [ ] Backend `.env`: the dev `MONGODB_URI` line is active and the production line is commented out. Restart the backend from `feature/admin-crm`.
- [ ] Admin panel running from `feature/admin-crm` against `http://localhost:5000`.
- [ ] **Demo lead "[DEMO] Nabin New"** (Rita's, New lead, no course). If it isn't in Rita's list:
  ```
  CRM_DEMO_MONGODB_URI='<dev uri>' npx ts-node -r tsconfig-paths/register src/scripts/seedCrmDemoData.ts --s8b
  ```
  (needs an earlier `--seed`; `--remove` cleans it up with the rest of the demo data).
- [ ] **Logins:** Super Admin (you); Admin Sita (`+crm-admin1`); Sales Rita (`+crm-sales1`) and Bikash (`+crm-sales2`). Demo password `CrmDemo#2026`; the code arrives in the tech.noteswift inbox.
- [ ] **Phone width:** Chrome DevTools, 390 × 844.

## 1. Action row and Stage select (Rita, on Nabin)

| ✓ | Steps | Expected |
|---|---|---|
| [ ] | Open Nabin's drawer | Actions: Log call · Schedule follow-up · **Assign course** · Record sale · WhatsApp · Mark lost. Facts show **Courses: None yet**. Under the facts: "Stage" select showing New lead, note "Payment pending and Enrolled are set by sales." |
| [ ] | Stage select options | Only New lead (current), Contacted, Interested. |
| [ ] | Pick Contacted | Toast "Moved to Contacted"; pill and tab follow; the select now offers only Interested. |
| [ ] | Pick Interested | The **Assign course** panel opens at the top with "Interested — no payment yet" chosen. The stage does not change until you assign. |

## 2. Assign course: Interested

| ✓ | Steps | Expected |
|---|---|---|
| [ ] | Assign course panel | Course select (paid and free courses), radios "Interested — no payment yet" (chosen) and "Payment pending — the student will pay", Note (optional), help "The student gets access only when a sale is confirmed or they pay in the app.", buttons Assign course / Cancel. "Assign course" is disabled until a course is chosen. |
| [ ] | Choose a course → Assign course | Toast "Course assigned · Interested". Stage **Interested**; the header shows the course; Courses fact shows "Course · Interested" (blue pill). Activity: "Course assigned: … · Interested". |
| [ ] | Stage select now | Shown as text "Interested" with the note (no manual move forward). |
| [ ] | Assign course again | The course you just assigned is not offered while "Interested" is chosen; switch to Payment pending and it appears, marked "(interested)". |
| [ ] | Double-click "Assign course" quickly on a new course | One course is added (one pill, one activity). |
| [ ] | In a second tab, assign the same course as Interested again before the first tab refreshes | "Already interested". |

## 3. Assign course: Payment pending

| ✓ | Steps | Expected |
|---|---|---|
| [ ] | Assign course → choose the Interested course → Payment pending → note "pays Friday" → Assign course | Toast "Course assigned · Payment pending". Stage **Payment pending**; the pill turns amber "Course · Payment pending" with a small **Cancel** link. Stage select shows text "Payment pending". Activity: "Course assigned: … · Payment pending (no access until paid)". |
| [ ] | Users page → Nabin | The same pending assignment shows there as "Payment pending" (it is the same record). The student has no access in the app. |
| [ ] | Choose a free course | "Payment pending" greys out with "(A free course has nothing to pay)". |
| [ ] | Record sale on Nabin | The course list starts with "Payment pending and interested" (the Payment pending and Interested courses), then other courses, then "Course not confirmed yet". |

## 4. Cancel

| ✓ | Steps | Expected |
|---|---|---|
| [ ] | Rita: Cancel on her Payment pending course → reason "Changed their mind" | Toast "Assignment cancelled". The pill is "Course · Interested" again; stage Interested (unless another course is pending). Users page shows it cancelled. |
| [ ] | Sita (Admin): Assign course → Payment pending on one of Rita's leads | Rita sees the amber pill **without** a Cancel link; Sita and Super Admin see Cancel and can cancel it. |

## 5. Confirming a sale

| ✓ | Steps | Expected |
|---|---|---|
| [ ] | Rita: Assign course → Payment pending on Nabin → Record sale for that course (cash) | Stage Payment pending; Record sale then hides (a sale is waiting). |
| [ ] | Sita: Sales & Bills → confirm it | Nabin becomes **Enrolled**; Courses fact "Course · Enrolled" (green, no Cancel); the Users page shows the assignment fulfilled and the course active. |

## 6. Prospects, Lost, other roles

| ✓ | Role | Steps | Expected |
|---|---|---|---|
| [ ] | Rita | Add lead (a prospect) → Assign course | "Payment pending" is disabled with "(Register the student first)"; Interested works. |
| [ ] | Rita | A Lost lead | Header: Lost pill, the reason and only "Reopen lead"; no Assign course and no Stage select. |
| [ ] | Rita | A lead of Bikash's by URL | "This lead doesn't exist or isn't assigned to you." |
| [ ] | Sita, Super Admin | Any lead, unassigned too | Assign course works in both modes. |
| [ ] | Rita | A student enrolled in course X → Assign course | X is not offered. |
| [ ] | Rita | A student on a trial | Courses fact shows "Course · Trial" (grey); the course can still be assigned. |

## 7. Nothing else changed

- [ ] **Users page:** Super Admin "Enroll now" and "Payment pending", Admin "Payment pending" still work as before (assign, cancel, enroll).
- [ ] **Orders & Payments:** lists and invalidation as before.

## 8. Phone width (390 px)

- [ ] The action row wraps; the Courses pills wrap; the Assign course panel fields stack; no sideways page scroll.

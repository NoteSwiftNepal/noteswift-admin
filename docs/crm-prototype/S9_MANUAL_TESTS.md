# Phase S9 manual tests: one Stage dropdown

This checklist is for the owner, to click through on **dev** (local backend on the development database). Tick each box and note anything wrong next to it. **Never point the backend or a script at production.**

## 0. Setup (dev only)

- [ ] Backend `.env`: the dev `MONGODB_URI` line is active and the production line is commented out. Restart the backend from `feature/admin-crm`.
- [ ] Admin panel running from `feature/admin-crm` against `http://localhost:5000`.
- [ ] **Nabin:** a newly registered student with no course activity, owned by Rita. If "[DEMO] Nabin New" isn't in Rita's list (or was used up by earlier tests), run in `Backend/noteswift-backend`:
  ```
  CRM_DEMO_MONGODB_URI='<dev uri>' npx ts-node -r tsconfig-paths/register src/scripts/seedCrmDemoData.ts --s8b
  ```
  (needs an earlier `--seed`). To start over: `--remove`, then `--seed`.
- [ ] **Logins:** Rita (Sales, `+crm-sales1`), Bikash (Sales, `+crm-sales2`), Sita (Admin, `+crm-admin1`), Super Admin (you). Demo password `CrmDemo#2026`; the code arrives in the tech.noteswift inbox.
- [ ] A student-app login for Nabin is not needed: "access" is checked on the Users page (Nabin → courses) or by logging in as the student if you set a password.
- [ ] **Phone width:** Chrome DevTools, 390 × 844.

## 1. Checks (as Rita unless stated)

| # | ✓ | Steps | Expected |
|---|---|---|---|
| 1 | [ ] | Open Nabin | The header pill reads **"New lead ▾"** in the New lead colour. Click it: a menu lists New lead (now) · Contacted · Interested · Payment pending · Enrolled · Lost. **Enrolled** is greyed with "Happens automatically when an Admin confirms the sale, or the student pays in the app." Esc closes the menu (not the drawer). The action row has Log call · Schedule follow-up · Record sale · WhatsApp · Mark lost (no "Assign course"). Courses: "None yet". |
| 2 | [ ] | Pill → Contacted → Save | Toast "Moved to Contacted"; the pill reads "Contacted ▾"; the row moves to the Contacted tab and the tab counts change. |
| 3 | [ ] | Pill → Interested → choose a course → Save | Toast "Course added · Interested"; pill "Interested ▾"; Courses shows the course with a blue **Interested** pill; tab counts change. |
| 4 | [ ] | Pill → Payment pending → "Student will pay later" → the course is prefilled → Save | Toast "Course held · Payment pending"; pill "Payment pending ▾"; Courses shows the course with an amber **Payment pending** pill and a "Cancel" link. Users page → Nabin: the course is "Payment pending" (no access). Opening the pill now: every option is greyed; New lead / Contacted / Interested / Lost say "Cancel the waiting sale or the held course first". Mark lost in the action row is greyed with the same reason. |
| 5 | [ ] | Courses → "Cancel" on the held course → reason → confirm | Toast "Assignment cancelled"; pill back to "Interested ▾"; the course pill blue again. |
| 6 | [ ] | Pill → Payment pending → "Money received: record sale" | The Record sale panel opens with the interested course already chosen. Paid by Cash → Create bill. Pill "Payment pending"; Sales & Bills → Waiting shows the sale. |
| 7 | [ ] | **As Sita:** Sales & Bills → confirm Nabin's sale | Nabin becomes **Enrolled** (pill and tab); Courses shows the course green **Enrolled**; Users page shows the course active (the student has access). |
| 8 | [ ] | As Rita on Nabin (Enrolled): open the pill | Only Interested and Lost are enabled (others "Not available for an enrolled student"; Enrolled "(now)"). Pick Interested → another course → Save: Courses shows the new course Interested under the Enrolled one; the pill stays Enrolled (enrolled wins). |
| 9 | [ ] | On an Interested lead (e.g. a fresh lead you moved to Interested), Record sale (cash), don't confirm; open the pill | Contacted is greyed with "Cancel the waiting sale or the held course first" (the lead is Payment pending). If a second tab still shows it as Interested and you pick Contacted → Save there: "Cancel the waiting sale or the held course first." and nothing closes. |
| 10 | [ ] | On another active lead: pill → Lost → Reason → Mark lost; then "Reopen lead" | Lost with the reason; only "Reopen lead" in the header (no dropdown); the activity says open courses and follow-ups were closed. Reopen: active again, the dropdown is back. |
| 11 | [ ] | A prospect (Add lead) → pill | Payment pending greyed with "Register the student first". Pill → Interested works. |
| 12 | [ ] | **As Bikash:** open Rita's Nabin by URL | "This lead doesn't exist or isn't assigned to you." |
| 13 | [ ] | Phone width 390px | The pill and its menu fit inside the screen; the Payment pending choices stack; the panels' fields stack; the Courses rows wrap long names with the pill beside or below; facts in one column; no overlap and no sideways scroll. Also check the drawer at 1440px and with the window at 520px. |

## 2. Also check

- [ ] **Admin and Super Admin** see the same dropdown on any lead, unassigned too.
- [ ] **List refresh:** after every move the row's Stage column and the tab counts update without reloading.
- [ ] **Long course names:** a lead with 3+ long-named courses — the Courses rows wrap and never overlap the facts above or the follow-ups below.

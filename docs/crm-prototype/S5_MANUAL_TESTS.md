# Phase S5 manual tests: CRM Dashboard, Team & Targets, My target

This checklist is for the owner, to click through on **dev** (local backend on the development database). Tick each box and note anything wrong next to it.

## 0. Setup (dev only)

- [ ] Backend `.env`: the `cluster0.an3ngc3` (dev) `MONGODB_URI` line is active and the production line is commented out. Restart the backend from `feature/admin-crm`.
- [ ] Admin panel running from `feature/admin-crm` against `http://localhost:5000`.
- [ ] Demo data. In `Backend/noteswift-backend`, with the dev URI only in your shell:
  - **Fresh** (the demo data isn't there yet): `--seed` adds the demo data and the targets data.
    ```
    CRM_DEMO_MONGODB_URI='<dev uri>' npx ts-node -r tsconfig-paths/register src/scripts/seedCrmDemoData.ts --seed
    ```
  - **The demo data already exists** (from S1–S3): `--targets` adds only the targets data.
    ```
    CRM_DEMO_MONGODB_URI='<dev uri>' npx ts-node -r tsconfig-paths/register src/scripts/seedCrmDemoData.ts --targets
    ```
  - **Clean up afterwards:** `--remove` also removes salaries, statements, adjustments and the month record the seed closed.
- [ ] **What `--targets` creates** (it prints a summary):
  - Rita: a salary of Rs 15,000 from **last** BS month, so this month has a target of Rs 1,50,000.
  - Bikash: no salary.
  - One Sales payment by Rita this month, confirmed by Sita, so it is credited to Rita.
  - One Rita payment still waiting for confirmation.
  - **Last month closed** by you. It is the first month with a salary, so nothing earlier is open.
  - If fewer than two of Rita's leads had an open, payable course, the summary says so: add a course opportunity and record a payment by hand (S3 checklist).
- [ ] **Logins.** Use a separate browser profile or private window per role. Demo staff log in with their email, password `CrmDemo#2026`, and the code from the tech.noteswift inbox.
  - **Super Admin:** you.
  - **Admin:** Sita (`tech.noteswift+crm-admin1@gmail.com`) and Hari (`+crm-admin2`).
  - **Sales:** Rita (`+crm-sales1`) and Bikash (`+crm-sales2`).
- [ ] **Today's BS date:** check it against a printed calendar. 29 Oct 2026 is 12 Kartik 2083.
- [ ] **Phone width:** Chrome DevTools device toolbar, 390 × 844.

## 1. Navigation

| ✓ | Role | Steps | Expected |
|---|---|---|---|
| [ ] | All | Sidebar → Sales & CRM | **CRM Dashboard** · Leads & Students · Sales Pipeline · Follow-ups & Tasks · Sales & Bills · **Team & Targets**. "Sales Team & Allocation" is gone. |
| [ ] | All | Click "Sales & CRM" group items | Only the item you're on is highlighted. CRM Dashboard is not highlighted on other CRM pages. |
| [ ] | All | Open `/dashboard/crm` | The dashboard (it no longer redirects to Leads). `/dashboard/leads` still redirects to Leads & Students. |
| [ ] | All | Badges | Follow-ups (overdue) and Sales & Bills (waiting) badges still match their pages. |

## 2. CRM Dashboard

| ✓ | Role | Steps | Expected |
|---|---|---|---|
| [ ] | Sita | Open CRM Dashboard | Title "CRM Dashboard", subtitle "{month} · sales and targets count confirmed payments only", month selector, "Add prospect". Tiles: New leads this month · Follow-ups today · Overdue follow-ups · Won this month · Team credited sales · Waiting confirmation, each with an explanation underneath. **No** "Company sales" tile. |
| [ ] | Super Admin | Same | Same, plus **Company sales this month**. |
| [ ] | Rita | Same | Title "My sales". "My credited sales" shows only her credited sales. Her "My target" card is on the left. |
| [ ] | Sita | Click each tile | New leads → Leads (New view); follow-ups → Follow-ups & Tasks; won → Pipeline; credited → Team & Targets; waiting → Sales & Bills. Super Admin's company tile → Sales & Bills filtered to this month. |
| [ ] | Sita | Compare numbers | Overdue = the Overdue tab count on Follow-ups & Tasks. Waiting = the Waiting confirmation count on Sales & Bills. Team credited = "Credited" on Team & Targets for this month. |
| [ ] | Sita | Target progress card | One row per rep with a salary or sales this month: name, "Rs achieved of Rs target", status pill, bar. Rita has a target; Bikash shows "no target" / "No salary set" if he has sales. |
| [ ] | All | Pipeline card | Five stages with counts and bars, plus "Won in {month}" (green) and "Lost in {month}" (red). Rita's counts cover only her leads. |
| [ ] | Sita | Needs attention | Up to 5 overdue tasks (lead, type, note, "Overdue since …", assignee), "+N more overdue" when there are more, the count of new leads not contacted within 24 h, and "N payments waiting for confirmation". "Open" / "View" / "Review" go to the right pages. |
| [ ] | Rita | Needs attention | Her overdue tasks (no assignee shown), uncontacted new leads, and "N of your payments rejected this month" if any (reject one in Sales & Bills to see it). |
| [ ] | Sita | Month selector → last month | Every figure changes to that month, and the "My target" / progress figures show the closed month. |
| [ ] | Any | Add prospect | Opens the existing dialog; creating one opens the new lead. |
| [ ] | Any | Backend stopped | An error with "Try again". |

## 3. Team & Targets: Targets tab (Admin and Super Admin)

| ✓ | Role | Steps | Expected |
|---|---|---|---|
| [ ] | Sita | Open Team & Targets | Title "Team & Targets"; tabs **Targets** (default) · **Team & allocation**. The URL gets `?tab=team` on the second tab, and reloading keeps it. |
| [ ] | Sita | Team & allocation tab | The earlier page, unchanged: KPI tiles, reps table, discounts waiting for approval, unlock codes for Sales. |
| [ ] | Sita | Targets tab, this month | Month selector, "{elapsed} of {days} days gone". Tiles Team target · Credited · Bonus payable so far. Table: Salesperson · Salary · Target · Credited (count, "Rs X waiting, not counted") · Progress (bar + %) · Needed / day · Bonus ("Rs X to go") · Status. Rita: salary Rs 15,000, target Rs 1,50,000. |
| [ ] | Sita | Salary cell | No pencil (Admin is read-only). |
| [ ] | Sita | Status pill colours | Ahead green, On track blue, Behind amber, Not selling red, No salary set grey; closed months Target met green, Missed red. |
| [ ] | Sita | Click Rita's row → "What counted" | The confirmed payments credited to Rita this month: student, course, receipt no., date, how, amount, and any adjustments. |
| [ ] | Sita | Rules card | The current rules (10 × salary, 4% from Rs 1,00,000, on track at 85%), fields disabled, "Only a Super Admin can change the rules". The example: "Rs 1,45,000 credited → 4% × 1,45,000 = Rs 5,800 bonus. Below Rs 1,00,000 → no bonus." |
| [ ] | Super Admin | Salary pencil on **Bikash** (no salary yet) | "Salary for Bikash": Now "Not set". Note "Applies from **{this month}** (a first salary applies to the current month)". Save Rs 12,000 with a reason: toast "Salary saved", and Bikash now has a target this month. |
| [ ] | Super Admin | Salary pencil on **Rita** (has a salary) | Note "Applies from **{next month}** (a change always applies from the next month…)". Save Rs 16,000: this month stays at Rs 15,000; the dialog shows Scheduled Rs 16,000 · {next month}; the history lists both. |
| [ ] | Super Admin | Rita again, save Rs 17,000 | The note says it replaces the change already scheduled; history shows "replaced an earlier change for that month"; scheduled is now Rs 17,000. |
| [ ] | Super Admin + another window | Open Rita's salary dialog in two windows, save in one, then save in the other | The second gets "The salary was changed by someone else. Reload and try again." and the dialog reloads. |
| [ ] | Super Admin | Rules card: change the multiplier to 12, Save rules | Toast "Rules saved — They apply from {next month}". The card shows "From {next month}: target 12 × salary …". This month's targets don't change. Switch the month selector to next month when it exists to see the new rules. |
| [ ] | Super Admin | Rules: bonus rate 150, Save | Refused ("The bonus rate must be 0 to 100 percent"). |

## 4. Closing a month (Super Admin)

| ✓ | Steps | Expected |
|---|---|---|
| [ ] | Targets tab, **this month** | No "Close month" button (it hasn't ended). The API would answer "{month} hasn't ended yet". |
| [ ] | Select **last month** (closed by the seed) | A "Closed" pill; tiles say "Bonus for the month"; no Needed / day column; statuses Target met / Missed. |
| [ ] | Try closing a month whose earlier month is open (only possible with an older month record; or with `curl` on a month two back) | Refused with "Close {earlier month} first: months are closed in order". |
| [ ] | After a month has ended (or on a dev month that is ended and open): "Close month" → confirm | The dialog explains the freeze and the next-month adjustments. Afterwards: "{month} closed — The statements are frozen", the Closed pill appears, and the month list shows "· closed". |
| [ ] | After closing, change Rita's salary (it applies next month) and the rules | The closed month's figures don't change. |
| [ ] | Optional: mark a payment credited in the closed month invalid (Orders & Payments → Mark invalid) | The closed month is unchanged. The current month shows an adjustment ("Rs −X adj.") and What counted lists it. |

## 5. "My target" (Sales)

| ✓ | Role | Steps | Expected |
|---|---|---|---|
| [ ] | Rita | Team & Targets | Title "My target"; **no tabs**, no team table, no salary editing, no rules card. |
| [ ] | Rita | Current month | The card shows the achieved amount, "of Rs 1,50,000 · %", a bar, Monthly / Weekly / Daily tiles, and a note. The note says "Sell Rs X a day for the next N days" (or "Target reached"), the bonus earned or "Rs X more to unlock the 4% bonus", and "Rs X waiting for confirmation, not counted yet". Under the card: "Your salary: Rs 15,000 (target = 10 × salary)", plus any scheduled change. "What counted" sits on the right. |
| [ ] | Rita | Month selector → last month | "Closed" pill, "Target missed." / "Target met." with "These figures are frozen". |
| [ ] | Bikash (no salary) | Team & Targets | "No salary is set for this month yet, so there is no target." |
| [ ] | Rita, with a Sales token (`curl`) | `GET /api/admin/crm/reps`, `/crm/settings`, `/crm/reps/<Bikash id>/salary-history`, `PUT /crm/reps/<id>/salary`, `/crm/quotes/pending`, `/crm/codes` | All **403**. `GET /crm/targets` returns only her own row; `GET /crm/targets/<Bikash id>/sales` returns **404**. |

```
curl -s -H "Authorization: Bearer $TOKEN_RITA" localhost:5000/api/admin/crm/reps          # 403
curl -s -H "Authorization: Bearer $TOKEN_RITA" localhost:5000/api/admin/crm/targets       # own row only
curl -s -H "Authorization: Bearer $TOKEN_RITA" localhost:5000/api/admin/crm/targets/$BIKASH_ID/sales   # 404
```

## 6. Sales & Bills month filter

| ✓ | Role | Steps | Expected |
|---|---|---|---|
| [ ] | Sita | Open Sales & Bills | A "Month" select next to the dates, set to the current month. List, counts and tiles cover this month. |
| [ ] | Sita | Pick last month | Only payments dated in last month (confirmation date once confirmed, recording date otherwise). |
| [ ] | Sita | Pick a From date | The Month select switches to "Any month". Picking a month clears the dates. |
| [ ] | Super Admin | From the dashboard's Company sales tile | Sales & Bills opens filtered to that month. |
| [ ] | Note | The Month list starts at the earliest salary month | Before any salary exists it only shows the current month; use the date range for older payments. |

## 7. Phone width (390 px)

- [ ] **Dashboard:** tiles stack, the two cards become one column, and the funnel labels shorten. There is no sideways page scroll.
- [ ] **Team & Targets:** the tabs scroll sideways, the table scrolls inside its card, and the salary, close and What counted dialogs fit.
- [ ] **My target:** the card and What counted stack, and the mini tiles become one column.

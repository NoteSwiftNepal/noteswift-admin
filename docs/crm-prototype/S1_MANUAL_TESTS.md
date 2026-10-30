# Phase S1 manual tests: CRM look

This checklist is for the owner, to click through the restyled Sales & CRM pages on **dev** (local backend on the development database). S1 changes only the look; every action should behave exactly as before.

Tick each box. Note anything that looks wrong or broken next to it.

## 0. Setup

- [ ] Backend `.env`: the `cluster0.an3ngc3` (dev) `MONGODB_URI` line is active and the production line is commented out. Restart the backend.
- [ ] Admin panel running against `http://localhost:5000`.
- [ ] Seed the demo data, if it isn't there yet. Run this in `Backend/noteswift-backend`, with the dev URI in your shell only:
  ```
  CRM_DEMO_MONGODB_URI='<dev uri>' npx ts-node -r tsconfig-paths/register src/scripts/seedCrmDemoData.ts --seed
  ```
  To remove it afterwards, run the same command with `--remove`.
- [ ] **Logins.** Use a separate browser profile or private window per role. Demo staff log in with their email, password `CrmDemo#2026`, and the code emailed to the tech.noteswift inbox.

  | Role | Login |
  |---|---|
  | **Super Admin** | your account (mobile OTP) |
  | **Admin** | `tech.noteswift+crm-admin1@gmail.com` (Sita) or `+crm-admin2` (Hari) |
  | **Sales** | `tech.noteswift+crm-sales1@gmail.com` (Rita) or `+crm-sales2` (Bikash) |

- [ ] **What the seed gives you:**
  - Sales accounts: Rita and Bikash.
  - Leads with course signals:
    - Anisha: viewed course A 2 h ago;
    - Bibek: abandoned checkout on B 3 h ago;
    - Chandni: owned by Bikash;
    - Dipesh: unassigned.
  - A pending 20% quote on Anisha, created by Rita.
  - A lost lead: Esha.
  - Two codes on B allocated to Rita.
  - Overdue and today tasks.
- [ ] If the seed was run more than a day ago:
  - Anisha's and Bibek's signals may be outside the follow-up window, so the contact gate blocks them. As Rita, open course A in the student app (or re-seed) to get a fresh signal.
  - Codes used in an earlier test need allocating again: as Sita, Team → Unlock codes for Sales.
- [ ] **Phone width:** Chrome DevTools device toolbar, 390 × 844 (iPhone 12/13/14).

## 1. Look and layout (every page, desktop ~1440px and phone 390px)

For each page below, as **Super Admin**, then **Admin**, then **Sales**:
- the page background is light blue-grey (`#F2F5FB`);
- text uses Figtree, and titles and card headers use Sora;
- cards are white with 14px corners and a soft shadow;
- buttons are blue (not black);
- at 390px there is no sideways page scroll: tables scroll inside their card and tab rows scroll sideways.

| ✓ | Page | Check |
|---|---|---|
| [ ] | Leads & Students (`/dashboard/crm/leads`) | Breadcrumb "Sales & CRM / Leads & Students"; title; "Add prospect" on the right. A card holding the search and filter selects, then underline view tabs with a count on each, then the table. Columns: Lead (name, then phone · email; Prospect / Do not contact / Possible duplicate pills) · Courses (stage pills plus titles) · Stage (contact-stage pill, plus status pill when not active) · Owner (Admin; amber "Unassigned" pill) · Last course activity · Next follow-up (red when overdue) · Source (Admin). Rows open the lead. |
| [ ] | Leads: tab counts | Each tab's count equals the number of rows you get when you open it (with the same filters). Changing a filter updates the counts. Sales see "My leads" and no "All leads" / "Unassigned" tabs. |
| [ ] | Lead profile (`/dashboard/crm/leads/<id>`) | "← Leads & Students" link; header card with name, contact, status / stage / owner pills and the action buttons. Underline tabs: Overview, Courses (n), Activity (n), Tasks (n), Quotes & payments, History (Admin / Super Admin only). |
| [ ] | Lead profile → Overview | "Student" card with a label/value grid (Phone, Email, Grade, District, School, Last contact) plus Priority and Contact stage selects; "Enrollment" card; full-width "Contact preferences" card with switches and consent records. |
| [ ] | Lead profile → Courses | One card per opportunity: title, stage pill (open) or Won / Granted / Lost pill (closed), Enrolled / Reopened pills, and a meta line. Open cards have Contact, a stage select and Lost. |
| [ ] | Lead profile → Activity | A timeline with coloured dots: green for a connected / message-sent outcome, red for a policy exception or "asked not to contact", grey for system events, blue otherwise. The actor and time are under each event. |
| [ ] | Lead profile → Tasks | List rows: type, purpose pill, status pill (blue open, red overdue, green completed, grey cancelled), the due line (red when overdue), green Done, Reschedule, Cancel. |
| [ ] | Lead profile → Quotes & payments | Quote rows in light boxes with status pills (Waiting for approval amber, Active green, others grey); green Approve. Payments table with status pills (completed green, failed red, other amber), Invalid red, Sale blue, Free grey, "Paid twice" amber. Sales see no Amount column. |
| [ ] | Lead profile → History (Admin) | "Ownership" and "Status changes" cards. |
| [ ] | Sales Pipeline (`/dashboard/crm/pipeline`) | Board / Table segmented control (selected = blue). Five columns with the stage name, the list-price total and a count bubble; white cards with name, course, price · activity, owner (Admin), Overdue / Do not contact pills, and a "Move to" select. At 390px the columns stack. Table view inside a card. |
| [ ] | Follow-ups & Tasks (`/dashboard/crm/tasks`) | Underline tabs Today · Overdue · Upcoming · All open · Completed · Cancelled, each with a count; "Assigned to" select top right (Admin). List rows: type (links to the lead), purpose pill, status pill, notes, due line (red when overdue), assignee (Admin); Done / Reschedule / Cancel / Open lead. |
| [ ] | Sales Team & Allocation (`/dashboard/crm/team`, Admin and Super Admin) | Three KPI tiles (Active salespeople, Available for new leads, Unassigned leads; the last is amber and clickable when above 0). "Salespeople" card with the table and status pills (Active green, Invited blue, Invite expired amber, Deactivated grey). The "Discounts waiting for approval" and "Unlock codes for Sales" cards match the card style. |
| [ ] | Sales: Team page | As Sales, `/dashboard/crm/team` redirects away (unchanged). |
| [ ] | Sidebar | Only the "Sales & CRM" group looks different: dark title, grey sub-items, active sub-item light blue with blue text, thin left line. Every other group is unchanged. |
| [ ] | Empty, loading and error states | A filter with no results shows a centred grey message. Loading shows a spinner and "Loading…". With the backend stopped, a page shows a red message and "Try again". |

## 2. Overlays opened from CRM pages

On a CRM page, open each and check that it uses Figtree / Sora, blue primary buttons, 16px dialog corners and a blue-grey (not black) backdrop:

| ✓ | Overlay | Where |
|---|---|---|
| [ ] | Select menus (view, stage, owner, course) | Leads filters, stage selects |
| [ ] | Add prospect dialog | Leads → Add prospect |
| [ ] | Assign leads dialog | Leads → select rows → Assign… |
| [ ] | Contact dialog (gate box, then the outcome step) | Lead → Contact |
| [ ] | Reason dialogs (Mark lost, Reopen, Do not contact, channel switch, cancel task, reject quote, take code back) | various |
| [ ] | Log activity dialog (with the red policy-exception box) | Lead → Activity → Log activity |
| [ ] | New / Complete / Reschedule task dialogs | Lead → Tasks; Follow-ups |
| [ ] | Record consent dialog | Lead → Overview |
| [ ] | Assign owner dialog | Lead → Assign / Reassign |
| [ ] | Course dialog (add opportunity / assign course pending) | Lead → Courses |
| [ ] | New quote dialog | Lead → Quotes & payments |
| [ ] | Enroll with a code dialog | Lead (Sales) → Enroll with code |
| [ ] | Invite salesperson, Allocation, Deactivate dialogs | Team |
| [ ] | Toasts | after any action. **Known:** toasts keep the panel's standard style (they render from the root layout, outside the CRM section). |
| [ ] | Phone width | Every dialog fits at 390px and its buttons stack. |

## 3. Non-CRM pages unchanged

Compare with how they looked before this change (`main`, or a screenshot you have):
- [ ] **Dashboard** (`/dashboard`): same fonts, colours, black primary buttons, cards and charts. Its sidebar is unchanged apart from the Sales & CRM group.
- [ ] **Orders & Payments** (`/dashboard/orders-payments`): same tabs, tables and buttons. Open "Add Offline Sale" (Super Admin) and a Select: shadcn look, black backdrop, Inter font. Mark a transaction invalid with too short a reason: the error text is the same red as before.
- [ ] Go from a CRM page to Orders & Payments and open a dialog: it doesn't keep the CRM look.

## 4. Follow-ups badge

- [ ] **Sales (Rita):** the red badge on "Follow-ups & Tasks" in the sidebar equals the count on the Overdue tab of Follow-ups & Tasks.
- [ ] **Admin:** same check; the badge counts everyone's overdue tasks, as the Overdue tab does with "Everyone".
- [ ] Complete an overdue task, then navigate to another page: the badge goes down by one. It refreshes on navigation, not live.
- [ ] With no overdue tasks there is no badge.

## 5. Phase 3–4 actions in the new look (each should behave exactly as before)

| ✓ | Role | Page | Steps | Expected |
|---|---|---|---|---|
| [ ] | Sales (Rita) | Leads | Add prospect: name, phone | Created; opens the new lead; owner Rita |
| [ ] | Admin | Leads | Add prospect with an existing student's phone | Refused "already in the CRM" without saying who |
| [ ] | Admin | Lead (Dipesh) | Assign → Rita, reason optional | Toast "Lead assigned"; owner pill shows Rita |
| [ ] | Admin | Leads | Tick 2 rows → selection bar → Assign… → round-robin | Toast "n assigned"; owners updated; selection cleared |
| [ ] | Admin | Leads | Selection bar → Clear | Selection removed |
| [ ] | Sales (Rita) | Lead (Anisha) → Courses → Contact on course A → Help with a course · Call | Gate box green "Allowed (because of a course view …)"; Start Call opens the call link; outcome step appears |
| [ ] | Sales (Rita) | Contact dialog | Choose an outcome (e.g. No answer), Save outcome | Activity shows "Call started" and "Outcome: No answer" |
| [ ] | Sales (Rita) | Lead (Esha, lost) or a do-not-contact lead → Contact | Gate box red with the reasons; Start disabled (header Contact disabled while do-not-contact is set) |
| [ ] | Sales (Rita) | Lead → Activity → Log activity | Call, We contacted them, summary | Appears in the timeline |
| [ ] | Sales (Rita) | Lead with do-not-contact → Log activity → outbound call | Red box asks for a policy-exception reason; saves with it; red "Policy exception" pill |
| [ ] | Sales (Rita) | Lead → Tasks → New task (Follow-up, due tomorrow) | Created; Tasks count +1 |
| [ ] | Sales (Rita) | Follow-ups → Today/Overdue → Done (outcome required) | Moves to Completed; green pill |
| [ ] | Sales (Rita) | Follow-ups → Reschedule (new date, reason) | Due date changes; "rescheduled 1×" |
| [ ] | Sales (Rita) | Follow-ups → Cancel (reason) | Moves to Cancelled |
| [ ] | Sales (Rita) | Lead → Courses → stage select → Contacted | Toast "Stage updated"; pill changes |
| [ ] | Sales (Rita) | Lead → Courses → Lost (reason) | The opportunity shows a red "Lost: …" pill and a Reopen button |
| [ ] | Sales (Rita) | Lead header → Mark lost (needs no open opportunities) / Reopen | Lost: status pill red, open tasks cancelled; Reopen: back to Active |
| [ ] | Sales (Rita) | Lead header → Do not contact (reason) | Red pill; Contact disabled; no Clear button for Sales |
| [ ] | Admin | Same lead → Clear do not contact (reason) | Pill gone; Contact enabled |
| [ ] | Sales (Rita) | Overview → turn WhatsApp off (reason) | Switch off; Sales can't turn it back on (disabled) |
| [ ] | Admin | Overview → turn WhatsApp back on | Allowed |
| [ ] | Sales (Rita) | Overview → Record consent (Marketing · WhatsApp · Granted) | Listed under Consent records |
| [ ] | Sales (Rita) | Courses → Add course opportunity (course C) | New card with the Interested pill |
| [ ] | Sales (Rita) | Courses → Assign course (payment pending) on a student lead | Toast; listed under Enrollment → Assigned, payment pending; the stage can then be Payment pending |
| [ ] | Sales (Rita) | Quotes & payments → New quote: course A → A promo code (DEMO15) | "Waiting for approval" pill; no Approve for Rita |
| [ ] | Admin (Sita) | Team → Discounts waiting for approval → Approve Rita's quote | Toast "Approved"; on the lead the quote shows Active |
| [ ] | Admin (Sita) | Create a discounted quote herself → Team | Row shows "Your quote: another approver decides" |
| [ ] | Admin (Hari) or Super Admin | Reject Sita's quote with a reason | Toast "Rejected"; quote shows Rejected |
| [ ] | Sales (Rita) | Lead (Anisha, student) → Enroll with code → pick one of her codes | Toast "Enrolled with the code"; Overview lists the course as enrolled |
| [ ] | Sales (Rita) | Pipeline → drag a card to another column | Toast "Moved to …"; the card moves |
| [ ] | Sales (Rita) | Pipeline → a card's "Move to" select | Same result; moving to Quoted without an active quote is refused with a toast |
| [ ] | Admin | Team → Invite salesperson (a new `+alias` email) | "Invitation sent", or the signup link is shown if email failed; row "Invited" |
| [ ] | Admin | Team → Allocation on Rita → change capacity and grades → Save | Toast "Allocation updated"; Takes / Open leads columns updated |
| [ ] | Admin | Team → Deactivate Bikash → move leads to Rita, reason | Toast "Deactivated; n lead(s) moved"; Chandni now owned by Rita. **Afterwards, re-seed or reactivate if you need Bikash again.** |
| [ ] | Admin | Team → Unlock codes for Sales → Not allocated → tick a code → Allocate to Rita | Toast "1 code(s) allocated" |
| [ ] | Admin | Show "Allocated to Rita" → Take back (reason) | Toast "Code taken back"; the code returns to Not allocated |

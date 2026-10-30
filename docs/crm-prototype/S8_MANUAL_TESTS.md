# Phase S8 manual tests: the CRM as the prototype (six stages, no quotes)

This checklist is for the owner, to click through on **dev** (local backend on the development database). Tick each box and note anything wrong next to it. **Never point the backend or a script at production.**

## 0. Setup (dev only)

- [ ] Backend `.env`: the dev `MONGODB_URI` line is active and the production line is commented out. Restart the backend from `feature/admin-crm`.
- [ ] Admin panel running from `feature/admin-crm` against `http://localhost:5000`.
- [ ] **Stage migration.** In `Backend/noteswift-backend`, with the dev URI in `.env`:
  1. Dry run:
     ```
     npx ts-node -r tsconfig-paths/register src/scripts/crmSimplifyStages.ts --dry-run
     ```
     On 2026-10-30 it reported 1 opportunity at qualified, 1 lead at contact_attempted and 1 lead at qualified. Nothing is written.
  2. Live:
     ```
     npx ts-node -r tsconfig-paths/register src/scripts/crmSimplifyStages.ts --live
     ```
  3. Run `--live` again: it rewrites 0 (idempotent).
- [ ] **Demo data:** `CRM_DEMO_MONGODB_URI='<dev uri>' npx ts-node -r tsconfig-paths/register src/scripts/seedCrmDemoData.ts --s7` (or `--seed` on a fresh database). Clean up with `--remove`.
- [ ] **Logins:** Super Admin (you); Admin Sita (`+crm-admin1`) and Hari (`+crm-admin2`); Sales Rita (`+crm-sales1`) and Bikash (`+crm-sales2`). Demo password `CrmDemo#2026`; the code arrives in the tech.noteswift inbox.
- [ ] **Prototype:** open `docs/crm-prototype/noteswift-crm.html` next to the real pages.
- [ ] **Phone width:** Chrome DevTools, 390 × 844.

## 1. Look, side by side with the prototype

| ✓ | Page | Expected |
|---|---|---|
| [ ] | Sidebar | Sales & CRM: CRM Dashboard · Leads · Follow-ups · Sales & Bills · Team & Targets. No Sales Pipeline. Badges on Follow-ups (overdue) and Sales & Bills (waiting). |
| [ ] | Leads | Page head "Leads" / "My leads", "+ Add lead". One card: search and "All salespeople" (Admin only). Tabs: All · New lead · Contacted · Interested · Payment pending · Enrolled · Lost · Unassigned (Admin), with counts. Table: checkbox (Admin) · Student (name, "Grade · District", a "Do not contact" pill if set) · Phone · Course interest ("+N more") · Owner (Admin) · Stage · Next follow-up · Source (Admin). No "More filters" and no "More views". |
| [ ] | Drawer | Header: name, "Grade · course", the stage pill (and the lost reason, Do not contact); actions Log call · Schedule follow-up · Record sale · WhatsApp · Mark lost (and a small "Assign" for Admin). No "⋯ More". Body: facts, the "Do not contact" link, Stage select, Open follow-ups, Sales, Activity. No Courses, Enrollment, Contact preferences, Consent, History, Earlier quotes or Priority. |
| [ ] | Panels | Log a call (What happened? / Note / Schedule next follow-up · When · How), Schedule follow-up (Type · Due · Note), Record sale (as S7), Mark as lost (Reason). |
| [ ] | Add lead | Student name; Student phone · Guardian phone; Guardian name · Course interest; School · District; Grade · Source; Assign to (Admin). No Email. |
| [ ] | Follow-ups | "Follow-ups", tabs Overdue · Today · Upcoming · Done. Rows "Name · type · phone", note, due (red on Overdue), assignee (Admin). Done / +1 day / Open lead. No purpose pill, no Cancelled or All open tab. |
| [ ] | Sales & Bills | Tabs Waiting · Confirmed · Rejected · All; filters Salesperson (Admin) and Month only. Columns Bill · Date · Student · Course · Amount · Paid by · Salesperson (Admin) · Status · actions. |
| [ ] | Dashboard | Pipeline card "n leads" with six rows: New lead, Contacted, Interested, Payment pending (amber), Enrolled (green), Lost (red). |
| [ ] | Team & Targets | As S5, plus "Max discount a salesperson can give (%)" in the rules card (Super Admin). Team & allocation tab without the discount-approvals and code cards. |

## 2. Stages of the seeded leads (Sita)

| ✓ | Lead | Expected stage |
|---|---|---|
| [ ] | [DEMO] Mohan Trial | New lead (a trial doesn't count) |
| [ ] | [DEMO] Chandni Bista, [DEMO] Dipesh Joshi, [DEMO] Kabita Prospect | Interested |
| [ ] | [DEMO] Bibek Rana, [DEMO] Hema Ojha | Payment pending |
| [ ] | [DEMO] Anisha Thapa, [DEMO] Ishan Pant, [DEMO] Gopal Saud (free), [DEMO] Kiran Enrolled, [DEMO] Laxmi Enrolled Interested | Enrolled |
| [ ] | [DEMO] Esha Bhatt | Lost |
| [ ] | Every tab | Its count equals its rows; New lead + Contacted + Interested + Payment pending + Enrolled + Lost = All. Rita sees only her leads and no Unassigned tab. |

The targets seed's waiting sale makes one of Rita's leads Payment pending.

## 3. Moving forward

| ✓ | Role | Steps | Expected |
|---|---|---|---|
| [ ] | Rita | Add lead (her own) → its drawer → Stage select | Offers "Contacted" and "Interested". The note says "Payment pending and Enrolled are set automatically from sales." |
| [ ] | Rita | Pick Contacted | Toast "Moved to Contacted"; the pill and the tab follow. The select now offers only Interested. |
| [ ] | Rita | Pick Interested → choose a course → Save | Interested; the course shows in the header. The Stage select disappears (no manual moves from Interested). |
| [ ] | Rita | A New lead with a recent course visit → Log call → "Call 98…" → What happened? Connected → Save call | The lead becomes **Contacted** (or stays Interested if it has an open course). "No answer" leaves it New lead. |
| [ ] | Rita | Record sale on an Interested lead | Payment pending. Sita confirms: Enrolled. Sita rejects instead (another lead): back to Interested. |

## 4. Record sale visibility (R64)

| ✓ | Role | Lead | Expected |
|---|---|---|---|
| [ ] | Rita | New lead / Contacted / Interested / Enrolled (registered student) | "Record sale" is shown. |
| [ ] | Rita | A lead with a sale waiting for confirmation | "Record sale" is hidden (not greyed). |
| [ ] | Rita | Bibek (Payment pending from a course assignment, no sale waiting) | "Record sale" is shown, to record the payment that settles it. |
| [ ] | Rita | Esha (Lost) | Only "Reopen lead". |
| [ ] | Rita | Kabita Prospect | No "Record sale"; the line "Not registered yet. The student must sign up before a sale can be recorded." |
| [ ] | Sita, Super Admin | Same leads | Same visibility (they can record too). |

## 5. Mark lost and Reopen

| ✓ | Role | Steps | Expected |
|---|---|---|---|
| [ ] | Rita | An Interested lead with an open follow-up → Mark lost → Reason "Too expensive" | The panel says "Open courses and follow-ups on this lead are closed too." Afterwards: stage Lost with the reason; Open follow-ups gone; the only action is Reopen lead; the activity shows "… open course(s) closed, … open follow-up(s) cancelled". |
| [ ] | Rita | Mark lost on a lead with a sale waiting | "A sale on this lead is waiting for confirmation; reject or cancel it first." |
| [ ] | Rita | Reopen lead | Active again; the closed courses and cancelled follow-ups stay closed. |

## 6. Contact gate and Do not contact

| ✓ | Role | Steps | Expected |
|---|---|---|---|
| [ ] | Rita | Log call on a registered student with no enquiry, no recent course visit and no consent | One red line, e.g. "Nothing to contact them about yet: no recent enquiry, course visit or marketing consent", and no form. |
| [ ] | Rita | Log call on a lead she doesn't own (URL) | The drawer says the lead doesn't exist or isn't assigned to her. |
| [ ] | Rita | "Do not contact" link at the bottom of the facts → reason | The pill appears; Log call / WhatsApp then show "The person is on do-not-contact". |
| [ ] | Rita | Log call outcome "Asked not to be contacted" | Do not contact is set. |
| [ ] | Rita / Sita | The Do not contact line | Rita sees no "Clear"; Sita (Admin) sees "Clear" and can clear it with a reason. |

## 7. Nothing left over

- [ ] **No quotes anywhere:** no quote section, "New quote", "Earlier quotes" or discount-approvals card. `GET /api/admin/crm/quotes/pending` answers 404.
- [ ] **No pipeline:** no Sales Pipeline in the sidebar; `/dashboard/crm/pipeline` opens Leads.
- [ ] **None of the removed elements:** no priority, consent, contact preferences, "More" menu, purpose pills or markers (other than Do not contact).
- [ ] **Follow-ups tabs:** Overdue, Today, Upcoming and Done counts match their rows. Done asks for an outcome; +1 day moves the due date.
- [ ] **Sales & Bills tabs and filters:** Waiting, Confirmed, Rejected and All match their rows (cancelled sales are under All). Salesperson and Month filter the list and the tiles.

## 8. Phone width (390 px)

- [ ] **Leads:** the tabs scroll sideways; the table scrolls inside the card; there is no page scroll sideways.
- [ ] **Drawer:** full width; the action row wraps; the facts are one column.
- [ ] **Follow-ups and Sales & Bills:** the rows wrap; the tabs scroll.

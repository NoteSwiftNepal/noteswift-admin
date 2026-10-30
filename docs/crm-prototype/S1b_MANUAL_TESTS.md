# Phase S1b manual tests: Leads list, lead drawer, Add lead

This checklist is for the owner, to click through on **dev** (local backend on the development database). Tick each box and note anything wrong next to it.

## 0. Setup (dev only)

- [ ] Backend `.env`: the dev `MONGODB_URI` line is active and the production line is commented out. Restart the backend from `feature/admin-crm`.
- [ ] Admin panel running from `feature/admin-crm` against `http://localhost:5000`.
- [ ] Demo data from the existing seed (`seedCrmDemoData.ts --seed`, or already there from S1–S5).
- [ ] **Logins.** Use one browser profile or private window per role.
  - **Super Admin:** you.
  - **Admin:** Sita (`+crm-admin1`).
  - **Sales:** Rita (`+crm-sales1`) and Bikash (`+crm-sales2`).
- [ ] **Prototype:** open `docs/crm-prototype/noteswift-crm.html` in a second window next to the real page, for the look checks. Its "Admin view / Salesperson view" switch matches Sita / Rita.
- [ ] **Phone width:** Chrome DevTools device toolbar, 390 × 844.

## 1. Look, side by side with the prototype

| ✓ | Where | Expected (same as the prototype) |
|---|---|---|
| [ ] | Page head | "Leads" (Sita) / "My leads" (Rita), the prototype subtitle, the blue "+ Add lead" button on the right. |
| [ ] | Card | One card: toolbar (search, "All salespeople", then a small "More filters" button), underline tabs with grey count bubbles, then the table. Same paddings, borders, radius and shadow. |
| [ ] | Table | Header row grey and uppercase. The Student column has a bold name with "Grade · District" under it. Unassigned shows an amber pill. The Stage column has one pill. Overdue follow-ups are red. Source is muted. Rows highlight on hover. |
| [ ] | Selection bar | Light blue bar under the tabs: "n selected", "Assign to…", reason, Assign, Clear. |
| [ ] | Drawer | 520 px wide on the right over a dark overlay. Header: the name, a "Grade · course" line and Close. A pill row. An action row: Log call (blue) · Schedule follow-up · Record payment · WhatsApp · Mark lost (red text) · ⋯ More. |
| [ ] | Panels | Blue-bordered, light blue blocks at the top of the drawer body with Save and Cancel. |
| [ ] | Facts | Two-column grid with small uppercase labels. |
| [ ] | Sections | "Open follow-ups", "Sales" and "Activity" headings and rows as in the prototype; timeline dots. |
| [ ] | Collapsed sections | Enrollment, Contact preferences, Past follow-ups, History (Admin): closed by default, each with a chevron that turns when opened. |
| [ ] | Add lead | Centred modal, "Add lead" with Close, a two-column form, then "Add lead" / "Cancel". |

## 2. Tabs, counts, filters

| ✓ | Role | Steps | Expected |
|---|---|---|---|
| [ ] | Sita | Look at the tabs | All · New · Today's follow-ups · Overdue · Payment pending · Enrolled · Lost · Unassigned · Recent course activity · Abandoned checkout · Do not contact. Each has a count. |
| [ ] | Sita | Click each tab | The number of rows (over all pages) equals the tab's count. |
| [ ] | Rita | Look at the tabs | No Unassigned tab. "All" shows only her leads, and its count equals the number of her leads. |
| [ ] | Sita | Today's follow-ups | Only leads with an open follow-up due today (Nepal time). |
| [ ] | Sita | Payment pending | Leads with a course at Payment pending, or with a payment waiting for confirmation (record one as Rita first if needed). |
| [ ] | Sita | Enrolled | Leads who have paid. Their Stage pill shows "Enrolled" when they have no open course. |
| [ ] | Sita | Order | Rows with the soonest follow-up come first, then rows without one, newest first. |
| [ ] | Sita | Search a school name, a phone, a name | Matching leads only; all counts follow the search. |
| [ ] | Sita | All salespeople → Rita | Only Rita's leads; the counts follow. |
| [ ] | Sita | More filters → Contact stage, Status, Course | The list and counts follow; the button shows a badge with how many are set; "Clear these filters" resets them. |
| [ ] | Sita | Reload the page with filters set | The filters are kept (they're in the URL). |
| [ ] | Sita | Course interest column | The course behind the stage pill, plus "+N more" when the lead has other open courses. |
| [ ] | Sita | Next follow-up column | "Today, 3:00 PM", "Tomorrow, …" or "24 Oct, …"; red when overdue; "None set" for active leads, "—" for lost or enrolled ones. |
| [ ] | Sita | Pagination (when there are more than 25) | "Page x of y · n leads", Previous / Next under the table. |

## 3. Bulk assign

| ✓ | Role | Steps | Expected |
|---|---|---|---|
| [ ] | Sita | Tick two unassigned leads | The selection bar appears. |
| [ ] | Sita | Assign to Rita, reason "test", Assign | Toast "2 assigned"; the rows show Rita; the Unassigned count drops by 2. |
| [ ] | Sita | Tick two, Assign to Round-robin | Each goes to a rep. |
| [ ] | Sita | Clear | The bar disappears. |
| [ ] | Rita | — | No checkboxes, no selection bar. |

## 4. The drawer: links and navigation

| ✓ | Steps | Expected |
|---|---|---|
| [ ] | Click a row | The drawer opens over the list; the URL becomes `/dashboard/crm/leads/<id>` (with your filters). The list stays in place, without reloading. |
| [ ] | Browser Back | The drawer closes; the list is as you left it. Forward opens it again. |
| [ ] | Close, the overlay, and Esc | Each closes the drawer. |
| [ ] | Keyboard: Tab to a row, Enter | The drawer opens with focus on Close. Tab stays inside the drawer. Esc closes it and focus is back on that row. |
| [ ] | Paste a lead URL in a new tab | The list loads with that lead's drawer open; Close leaves you on the list. |
| [ ] | Pipeline card name · Follow-ups "Open lead" · Sales & Bills student name · Dashboard "Open" · What counted student name | Each opens the Leads list with that lead's drawer. |
| [ ] | Rita: open a URL of Bikash's lead | The drawer says "This lead doesn't exist or isn't assigned to you." |

## 5. Drawer actions (Rita, on her own lead)

| ✓ | Steps | Expected |
|---|---|---|
| [ ] | Log call | The contact panel opens with Channel Call: Purpose, Channel, and a green "Allowed because of …" box (or red "Blocked" with the reasons). "Start Call" works only when allowed. |
| [ ] | Start Call | "Call started. Number: 98…" (selectable) and "Call now" (a tel: link). Then "What happened?", Note, "Schedule next follow-up" (ticked), When and How. Save call: toast; the activity shows the call and outcome; the follow-up appears in Open follow-ups. |
| [ ] | Outcome "Asked not to be contacted" | A red warning; no follow-up fields; after saving, the lead shows "Do not contact". |
| [ ] | WhatsApp | The same panel with Channel WhatsApp; after Start, "Open WhatsApp" (wa.me, new tab). Never a plain link without the gate. |
| [ ] | A lead with Do not contact | Log call, WhatsApp and course Contact are greyed out in place; hovering says "Do not contact is set". |
| [ ] | Turn WhatsApp off in Contact preferences (as Rita) | WhatsApp is greyed out with "WhatsApp is turned off for this lead". |
| [ ] | Schedule follow-up | Type, Due, Purpose (and Channel for types without one) for contact types, Course, Priority, Note. Schedule: toast; the row appears in Open follow-ups. A contact task the rules block gives a red message with the reasons. |
| [ ] | Record payment (student lead with an open, payable course) | The S3 form as a panel: the price read-only from the server, Paid by, date, reference, screenshot, note, and the confirmation note. Record: toast "Payment recorded"; the Sales section shows it as "Waiting confirmation". |
| [ ] | Record payment on a prospect, or with no open course | Greyed out in place; hovering gives the reason. |
| [ ] | Mark lost with an open course | The panel says "Close its open courses first", lists them, and "Go to Courses" scrolls there. No "Try again later". |
| [ ] | Close the courses (Lost on each), then Mark lost | Pick a reason (or Other plus your words), add details if you like, then Mark lost. The pill turns "Lost" with the reason; open follow-ups are cancelled; the action row becomes "Reopen lead". |
| [ ] | Reopen lead | The optional reason dialog; the lead is active again. |
| [ ] | ⋯ More | Rita sees Do not contact and Enroll with code (student leads). No Assign, and no Clear do not contact. |
| [ ] | Stage select and Priority | Save on change with a toast; the note "Course stages are below. Payment pending and Won are set automatically." |
| [ ] | Guardian "Add" / "Edit" | A panel with name and phone; saved values show in the facts. |
| [ ] | A student with a linked parent account | Guardian shows the parent's name and phone with "Linked parent account", and no Edit (R40). |
| [ ] | Courses: stage select, Contact, Lost, Reopen | They work as on the old profile page; "+ Add course" opens a course panel. |
| [ ] | Open follow-ups: Done | An inline "Outcome" box appears; Save stays disabled until you type one. Saving moves the task to Past follow-ups. |
| [ ] | Open follow-ups: +1 day | The due date moves a day (from now if it was overdue); Past follow-ups shows "rescheduled 1×" later; the reason is "Moved by 1 day". |
| [ ] | Open follow-ups: Cancel | Asks for a reason; the task moves to Past follow-ups as Cancelled. |
| [ ] | Sales: Bill | The S3 bill dialog opens over the drawer; Esc closes only the bill. |
| [ ] | Activity: Log activity | The panel (Type, Direction or How, Course, What happened). Logging an outbound call when the rules block it shows the policy-exception reason box. |
| [ ] | Activity: Load more (a lead with more than 30 events) | Older events are added below. |

## 6. Drawer actions (Sita, Admin)

| ✓ | Steps | Expected |
|---|---|---|
| [ ] | Facts | Source and Added are shown; Owner is a select. |
| [ ] | Change Owner in the facts | An "Assign / Reassign lead" panel at the top with the chosen rep and an optional reason; Assign gives a toast and the list row updates. |
| [ ] | ⋯ More → Reassign | The same panel. |
| [ ] | ⋯ More → Clear do not contact (on a DNC lead) | The reason dialog; the pill disappears. |
| [ ] | No Record payment button | Admin can't record payments. |
| [ ] | "Assign course (payment pending)" | A panel with course and note; the course shows under Enrollment → Assigned, payment pending, with Cancel. |
| [ ] | History (collapsed) | Ownership changes and status changes, with who, how and when. |
| [ ] | Sales: a quote waiting for approval created by Rita | Approve / Reject buttons; "New quote" when the lead has an open course. |
| [ ] | Super Admin: ⋯ More → Enroll with code | The code dialog, as before. |

## 7. Add lead

| ✓ | Role | Steps | Expected |
|---|---|---|---|
| [ ] | Rita | + Add lead | Student name, Student phone · Guardian phone, Guardian name · Course interest, School · District, Grade · Source, Email. No "Assign to". |
| [ ] | Rita | Phone "12345" | "Enter a 10-digit Nepali mobile number starting with 96, 97 or 98." |
| [ ] | Rita | No phone and no email | "Enter the student's phone number or an email." |
| [ ] | Rita | Name, a new phone, a guardian, a course, Source School visit, Add lead | Toast "Lead added". The new lead's drawer opens: owner Rita; one course at Interested; Guardian filled. The list shows it, and Sita sees Source "School visit". |
| [ ] | Rita | The same phone again | A red note: "This person is already in the CRM. Ask an Admin to assign them to you." It doesn't say who. |
| [ ] | Rita | A phone of a registered student | A red duplicate note; no new lead. |
| [ ] | Sita | + Add lead | "Assign to" with "Leave unassigned" (the default) and the active reps; no "fewest open leads" option. No "first-call follow-up in 15 minutes" note. |
| [ ] | Sita | CRM Dashboard → Add lead | The same modal; on success the Leads list opens with the new lead's drawer. |
| [ ] | Any | Esc or the overlay | Closes the modal. |

## 8. Phone width (390 px)

- [ ] **Leads:** the table scrolls sideways inside the card, the tabs scroll sideways, and the page itself doesn't scroll sideways.
- [ ] **Drawer:** full width; the facts become one column; the action row wraps; the body scrolls inside the drawer.
- [ ] **Add lead:** the form becomes one column and the modal fits the screen.

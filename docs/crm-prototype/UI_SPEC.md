# Sales & CRM UI spec (from the prototype)

This spec describes the look of `noteswift-crm.html`, the single-file React prototype in this folder, for Phase S1 onwards. It was read from the prototype's CSS and components on 2026-10-29.

The prototype is a **design reference only**. It is never imported, built or shipped. It uses example data and a simplified single-stage lead model. Our data model, permissions and approved rules (backend `CRM_IMPLEMENTATION.md`) always win over its behaviour; see §6 for what we don't copy.

Scope (R33):
- The look applies to the Sales & CRM pages only. The rest of the panel keeps its current shadcn look.
- No dark mode for now. The prototype has dark tokens; they are listed for later and not implemented.
- ~~The lead profile stays a full page.~~ Since S1b (R53, 2026-10-29) the lead opens in the prototype's side drawer over the Leads list; `/dashboard/crm/leads/[leadId]` is the list with the drawer open.

**R78, R79 (2026-11-02):** the drawer header has a "Processing for" course picker under the actions, remembered on the lead. Record sale and the Sales list follow it: the panel shows the course locked, and the list shows that course with an "All courses" link. Record sale also shows at Temporary enrollment. Do not contact is removed everywhere; where older text below mentions it, this note wins.

**S8 (2026-10-30, R61–R66): the CRM now follows the prototype screen for screen.** Every lead is in one of six stages (New lead accent · Contacted neutral · Interested accent · Payment pending warn · Enrolled good · Lost bad), shown as the Leads tabs, the Stage pill and the dashboard funnel. Removed from the UI: the Pipeline page (redirects to Leads), quotes everywhere, markers other than "Do not contact", priority, purpose pills, contact-stage sub lines, "More views" / "More filters", the drawer's "⋯ More" menu and its Courses, Enrollment, Contact preferences, Consent, History and Earlier quotes sections, the Follow-ups Cancelled / All open tabs, and the Sales & Bills search, method, kind and date filters. Kept beyond the prototype (approved rules): the contact gate inside Log call / WhatsApp (shown only when it blocks), Do not contact, Admin assignment and the selection bar, Sales & Bills confirm / reject / screenshot / PDF rules, Team & allocation, salary edit and month close. Where this spec's older sections (§5, §6) disagree, S8 wins.

Contents: 1 Tokens · 2 Type, spacing, radius, shadow · 3 Components · 4 Pages · 5 Mapping to our code · 6 Not copied · 7 Gaps.

---

## 1. Design tokens

All colours are CSS variables on `:root`. In S1 they are scoped to the CRM area (e.g. a `.crm` wrapper class or a CRM layout), so they don't change the rest of the panel.

| Token | Light | Dark (not used now) | Used for |
|---|---|---|---|
| `--bg` | `#F2F5FB` | `#0A1120` | page background |
| `--surface` | `#FFFFFF` | `#111A2D` | cards, sidebar, inputs, modal |
| `--surface-2` | `#F6F8FC` | `#16213A` | table header, hover rows, mini tiles, neutral pill, notes |
| `--fg` | `#0E1A33` | `#E5EBF6` | text; toast background |
| `--muted` | `#5A6A86` | `#97A5BE` | secondary text, labels, inactive nav and tabs |
| `--line` | `#DDE4EF` | `#24324D` | every border and divider |
| `--accent` | `#1F5FD6` | `#6C9BF2` | primary buttons, active tab and nav text, links, progress fill, focus ring |
| `--accent-soft` | `#E6EEFD` | `#1A2B4D` | active nav background, accent pill, inline panel, selection bar |
| `--accent-fg` | `#FFFFFF` | `#0A1120` | text on accent |
| `--good` | `#0F7A55` | `#48C795` | success text, good button, good pill, switch on |
| `--good-soft` | `#E1F4EC` | `#123326` | good pill background |
| `--warn` | `#9A5B00` | `#F0B451` | warning text and pill |
| `--warn-soft` | `#FCF0DA` | `#3A2A0F` | warning pill background |
| `--bad` | `#B8322A` | `#F07A70` | overdue text, danger button text, bad pill, nav count badge |
| `--bad-soft` | `#FBE6E4` | `#3D1A18` | bad pill and count badge background |
| `--overlay` | `rgba(14,26,51,.40)` | `rgba(0,0,0,.55)` | modal backdrop |
| `--shadow` | `0 1px 2px rgba(14,26,51,.05), 0 6px 18px rgba(14,26,51,.05)` | `0 1px 2px rgba(0,0,0,.3), 0 6px 18px rgba(0,0,0,.25)` | cards, modal, toast |

**Fonts.**
- `--font-body`: `"Figtree", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Weights 400, 500, 600, 700.
- `--font-display`: `"Sora", "Figtree", system-ui, sans-serif`. Weights 600, 700.
- The prototype loads both from Google Fonts. In S1, load them with `next/font/google` and apply the generated variables to the CRM wrapper. This avoids the font-name problem found in the investigation, where the panel's Inter is referenced by a literal family name.

## 2. Type, spacing, radius, shadow

**Type** (body is 14px / 1.45, with tabular numbers everywhere):

| Use | Font | Size | Weight / other |
|---|---|---|---|
| Page title `h1` | display | 22px (19px under 520px) | 600 default, letter-spacing −.01em |
| Section title `h2` (card header) | display | 15px | 600 |
| Sub-section `h3` | display | 14px | 600 |
| Body | body | 14px | 400 |
| Table text | body | 13px | 400 |
| Table header | body | 11.5px | 600, uppercase, letter-spacing .05em, muted |
| Small / secondary (`.small`, `.sub2`, crumb) | body | 12.5px (`.sub2` 12px) | muted |
| Field label | body | 12.5px | 600, muted |
| KPI label | body | 12px | 600, uppercase, letter-spacing .05em, muted |
| KPI value | display | 22px | 700 |
| Big number (My target) | display | 28px | 700 |
| Mini tile value / label | display 15px / body 11.5px | | 700 / 600 uppercase |
| Button | body | 13px (`sm` 12px) | 600 |
| Tab | body | 13px | 600 |
| Pill | body | 12px | 600 |
| Nav count badge | body | 11px | 700 |

**Spacing:**
- Page body padding 16px.
- Shell gap 16px; the main column stacks sections with gap 16px.
- Card header padding 14px 16px; card body 14px 16px.
- KPI grid gap 12px. Form grid gap 12px. Toolbar gap 8px. Action rows gap 6px.
- List rows: padding 10px 0 with a bottom divider.
- Table cells: 10px 12px.

**Radius:**
- 16px: modal.
- 14px: card, sidebar.
- 12px: KPI tile, inline panel, bill.
- 10px: segmented control, note, mini tile, toast.
- 8px: button, input, nav item.
- 7px: segment button.
- 6px: funnel bar, stamp.
- 999px: pill, badge, progress bar, switch, tab count.

**Shadow:** `--shadow` only on cards, modal and toast. KPI tiles have no shadow; their border turns accent on hover.

**Max width:** the shell is capped at 1440px and centred.

## 3. Components (exact values)

**Sidebar (`.side`):**
- Container: sticky (top 16px), background surface, 1px line border, radius 14px, padding 14px 10px, a flex column with gap 2px. Width 236px from the shell grid.
- Brand block: padding 4px 8px 14px, a bottom line border, margin-bottom 8px. Logo tile 30×30px, radius 8px, accent background, accent-fg text, display font 13px/700. Name in display 14px bold; "Admin Panel" in muted 12.5px below it.
- Nav item (`.nav`):
  - layout: flex, gap 10px, full width, padding 8px 10px, radius 8px, muted text, weight 500;
  - icon 17×17px, stroke 1.8;
  - hover: surface-2 background, fg text;
  - active: accent-soft background, accent text, weight 600.
- Group head (`.nav.group-head`): fg text, weight 600. It ends with a 14px chevron rotated 90° when open (transition .15s).
- Sub list (`.sub`): flex column, gap 2px, padding-left 16px, margin-left 18px, a 1px line left border. Sub items use padding 7px 10px.
- Count badge (`.badge`): pushed right (`margin-left:auto`), 11px/700, bad-soft background, bad text, radius 999px, padding 1px 7px. It shows overdue follow-ups on Follow-ups, and pending payments on Sales & Bills for Admin only.

**Top bar:**
- A flex row with space-between, wrapping, gap 10px.
- Breadcrumb: muted 12.5px "Sales & CRM / **Page**", with the page name in fg bold.
- The prototype's segmented "View as" control is a demo device only (§6). The segmented style itself (`.seg`) is reusable for small toggles: surface background, line border, radius 10px, padding 3px, gap 2px; buttons 6px 10px, radius 7px, 13px/500 muted; selected `.on` is accent with accent-fg.

**Mobile nav (`.mobnav`, under 880px):** the sidebar is hidden and a horizontal scroll row of pill buttons replaces it.
- Pill buttons: surface background, line border, radius 999px, padding 7px 12px, weight 500. The selected one is accent with accent-fg.
- Counts are shown as " (n)".

**Page header (`.page-head`):** a wrapping flex row with space-between and `align-items:flex-end`, gap 12px.
- Left: `h1`, plus a muted subtitle `p` with margin 4px 0 0.
- Right: the primary action button (e.g. "+ Add lead").

**KPI tile (`.kpi`):**
- Surface background, line border, radius 12px, padding 12px 14px, a column with gap 2px, left-aligned.
- Order: label (uppercase 12px muted), value (display 22px/700), caption (muted 12.5px).
- Tones colour the value only: `.good` good, `.warn` warn, `.bad` bad.
- It is a button that navigates (hover border accent), or `cursor:default` when static.
- Grid: `repeat(auto-fit, minmax(170px,1fr))`, gap 12px.

**Card (`.card`):**
- Surface background, line border, radius 14px, shadow, `min-width:0`.
- Header `.card-h`: flex with space-between, wrap, gap 10px, padding 14px 16px, a bottom line border. It holds an `h2` on the left and a small button or muted note on the right.
- Body `.card-b`: padding 14px 16px.
- Two-column layout `.grid2`: 2 equal columns, gap 16px; one column under 980px.

**Underline tabs with counts (`.tabs` / `.tab`):**
- Tab row: flex, gap 4px, scrolls horizontally, padding 10px 16px 0, a bottom line border.
- Tab: no border except a 2px transparent bottom; padding 8px 10px; muted 13px/600; nowrap.
- Selected `.on`: accent text and accent bottom border.
- Count `.n`: 11px, surface-2 background, line border, radius 999px, padding 0 6px, margin-left 4px, muted.
- Tabs sit inside a card, directly above its table or list.

**Table:**
- Wrapper `.tw`: `overflow-x:auto`. Table: full width, collapsed borders, 13px.
- `th`: left-aligned, 11.5px uppercase, letter-spacing .05em, muted, 600, padding 10px 12px, bottom line border, nowrap, surface-2 background.
- `td`: padding 10px 12px, bottom line border, `vertical-align:middle`; the last row has no border.
- Clickable rows `tr.click`: pointer; hover paints the cells surface-2.
- Two-line cell: a bold first line, then a `.sub2` block line (12px muted).
- Number columns `.num`: right-aligned, nowrap.
- Overdue cell `.late`: bad text, 600.

**Status pill (`.pill`):**
- Base: inline-flex, gap 5px, 12px/600, radius 999px, padding 2px 9px, nowrap. A 6px dot drawn by `::before` in `currentColor`.
- Tones:
  - default (neutral): surface-2 background, muted text, line border;
  - `.accent`: accent-soft background, accent text, no border;
  - `.good`: good-soft background, good text, no border;
  - `.warn`: warn-soft background, warn text, no border;
  - `.bad`: bad-soft background, bad text, no border.
- Prototype uses:
  - New lead accent, Contacted neutral, Interested accent, Payment pending warn, Enrolled good, Lost bad;
  - target status Ahead good, On track accent, Behind warn, Not selling bad;
  - bills Verified good, Waiting verification / Needs approval warn, Rejected bad;
  - "Unassigned" warn.

**Progress bar (`.bar`):**
- Track: height 8px, radius 999px, surface-2 background, line border, hidden overflow.
- Fill `i`: accent, or `.good` / `.warn` / `.bad`. Width = value clamped to 0–100%.
- Tone by status: Ahead good, On track accent, Behind warn, Not selling bad.

**Funnel (`.funnel` / `.frow`):**
- Rows are a grid `120px | 1fr | 36px` (92px / 30px under 520px), gap 10px, 13px.
- Bar: 22px high, radius 6px, accent-soft track, accent fill with a 4px minimum.
- Colours: lost bad, enrolled good, payment pending warn.

**Buttons (`.btn`):**
- Base: inline-flex, gap 6px, 1px line border, surface background, padding 7px 12px, radius 8px, 13px/600, nowrap. Hover gives an accent border and accent text.
- Variants:
  - `.primary`: accent background and border, accent-fg text; hover `brightness(1.08)`;
  - `.good`: good background and border, surface text (used for Done / Verify);
  - `.danger`: bad text only (border stays line);
  - `.sm`: padding 4px 9px, 12px.
- Disabled: opacity .5, `not-allowed`.
- Focus everywhere: `outline: 2px solid var(--accent); outline-offset: 2px`.
- The button text in the prototype uses a "+ " prefix for create actions ("+ Add lead").

**Form fields:**
- `.input` (input, select, textarea): full width, line border, surface background, radius 8px, padding 8px 10px. Textareas resize vertically, min height 64px.
- `label.f`: a column with gap 4px; the label text is 12.5px/600 muted above the control. Checkbox labels are a row with gap 8px.
- `.form`: a 2-column grid, gap 12px; `.full` spans both. One column under 520px.
- `.toolbar`: wrapping flex, gap 8px. The search input grows (`flex:1 1 200px`); selects are fixed (e.g. `flex:0 1 200px`).

**Panel (`.panel`):** an inline form block, used for log call, schedule, record sale and mark lost.
- 1px accent border, radius 12px, padding 14px, accent-soft background, a column with gap 12px.
- An `h3` title, the form grid, then an action row (primary + plain Cancel).

**Drawer (`.drawer`), used since S1b (R53):**
- Fixed right, width `min(520px,100%)`, surface background, left line border.
- Header: padding 16px 18px, bottom border, a column with gap 10px.
- Body: padding 16px 18px, scrolls, a column with gap 16px.

**Facts list (`.facts`):**
- A 2-column grid, gap 10px 16px (1 column under 520px).
- `dt`: 11.5px uppercase muted 600. `dd`: margin 2px 0 0, breaks long words.

**Timeline (`.timeline` / `.ev`):**
- Each event is a grid `12px | 1fr`, gap 10px, bottom padding 12px.
- A 1px line connects the dots (hidden after the last event).
- Dot: 11px circle, surface fill, 2px accent border. Tones: `.good`, `.bad`, `.muted` change the border colour.
- Text in body size; then muted 12.5px "actor · relative time".

**List rows (`.list` / `.li`):** flex, gap 12px, space-between, wrapping; padding 10px 0, bottom line border except the last. Left `.who` has a bold name, a muted inline detail and a `.sub2` line; right has actions.

**Selection bar (`.selbar`):** shown above a table when rows are selected. Flex, gap 8px, padding 10px 16px, accent-soft background, bottom line border. It reads "**n selected**", then an "Assign to…" select, a primary sm "Assign" and a plain sm "Clear".

**Modal (`.modal`):**
- Fixed and centred, width `min(560px, 100% − 32px)`, max height `100% − 48px` with scrolling.
- Surface background, line border, radius 16px, shadow.
- Structure: a `.card-h` header (h2 + plain sm "Close") and a `.card-b` body as a column with gap 14px.
- Backdrop `.overlay`: fixed inset, `--overlay`, z-index 40 (modal 41). Esc closes it.

**Bill (`.bill`), inside the modal:**
- Container: line border, radius 12px, padding 18px, a column with gap 14px, surface background.
- Top row: company name (display 16px bold), address line, "Payment receipt" (muted `.sub2`). A **stamp** sits on the right:
  - display 12px/700, letter-spacing .08em, uppercase;
  - 2px `currentColor` border, radius 6px, padding 3px 8px, rotated −4°;
  - `.good` "Paid · Verified", `.warn` "Pending verification", `.bad` "Rejected".
- Facts: Bill no., Date, Student, Phone.
- Items table (cells padding 8px 6px): course + list price; "Discount −Rs x"; **Total paid**.
- Facts: Paid by (method · reference), Sold by; "Rejected because" when rejected.

**Note (`.note`):** 12.5px muted, surface-2 background, a 1px **dashed** line border, radius 10px, padding 8px 12px. Used for help text and inline errors (with bad text colour).

**Mini tiles (`.mini`):** a 3-column grid with gap 10px (1 column under 520px). Each tile: surface-2 background, line border, radius 10px, padding 10px. An uppercase label above a display 15px bold value (Monthly / Weekly / Daily).

**Switch (`.switch`):** 36×20px, radius 999px, line background. A 16px surface knob slides 2px → 18px; on: good background.

**Toast (`.toast`):**
- Fixed at the bottom centre (20px plus the safe area), fg background, bg text, padding 10px 16px, radius 10px, 600, shadow, z-index 60.
- Auto-hides after 2.6s and uses `role="status"`.
- Copy is a short past-tense phrase: "Call logged", "Lead added", "Verified · counts toward target".

**Empty state (`.empty`):** padding 28px 16px, centred, muted. Copy suggests the next step, e.g. "No leads here. Try another tab or clear the search."

**Footer (`.foot`):** 12px muted, centred. Prototype only.

**Formats used:**
- Money: `Rs 1,45,000` (en-IN grouping, no decimals).
- Dates: "26 Oct"; date-time "26 Oct, 5:30 PM"; relative "Today, 3:00 PM" / "Yesterday, …" / "Tomorrow, …".
- Percent: rounded "78%".

**Breakpoints:**
- ≤ 980px: `grid2` becomes one column.
- ≤ 880px: the sidebar is hidden and the mobile pill nav is shown.
- ≤ 520px: forms, facts and mini tiles become one column, the funnel narrows and `h1` drops to 19px.

## 4. Pages (top to bottom)

**Dashboard clean-up (2026-11-01):** tiles show a short label and the value (plus the payment count on money tiles); what a tile includes moved to its hover hint. The subtitle is the month. Needs attention rows are one short line with no advice text.

**CRM Dashboard** (Admin: "CRM Dashboard"; Sales: "My sales today"):
1. Page header: title; subtitle "{month} · targets and sales count verified payments only"; primary "+ Add lead".
2. KPI grid of 6 clickable tiles:
   - New leads this month (caption: "n unassigned" for Admin);
   - Follow-ups today;
   - Overdue follow-ups (bad when > 0, good when 0);
   - Enrolled this month (good);
   - Verified sales (amount);
   - Waiting verification (warn; caption "Rs x not counted yet").
3. `grid2`:
   - left, Admin: card "Target progress · {month}" with an sm "Team & Targets" button. Each rep row: name bold, muted "Rs a of Rs t", status pill on the right, full-width progress bar below.
   - left, Sales: the "My target" card.
   - right: card "Pipeline" with "n leads": a funnel of stage counts.
4. Card "Needs attention" with an sm "All follow-ups" button. The list holds:
   - up to 5 overdue tasks ("Name · Type · note", red "Overdue since …", owner for Admin; sm "Open");
   - "n new leads not called within 24 hours" (sm "View");
   - Admin only: "n sales waiting for verification" (sm "Review").

   Empty: "Nothing urgent. Every lead has a next step."

**My target card:**
- Header "My target · {month}" with a status pill.
- Big achieved amount, then muted "of Rs t · p%"; a progress bar.
- Mini tiles: Monthly / Weekly / Daily.
- A note: "Sell **Rs x** a day for the next n days to hit target." or "**Target reached.** Everything more adds to your bonus."; plus "Bonus earned so far: **Rs b**." or "**Rs y** more to unlock the r% bonus."; plus "Rs z is waiting for verification."

**Leads** (Admin "Leads", Sales "My leads"):
1. Header: subtitle "Every student enquiry, with one owner and a next step" (Sales: "Students assigned to you"); "+ Add lead".
2. One card containing:
   - a toolbar: search "Search name, phone, school" (also matches guardian phone) and, for Admin, an owner select ("All salespeople", "Unassigned", reps);
   - underline tabs with counts: All · New · Today's follow-ups · Overdue · Payment pending · Enrolled · Lost · Unassigned (Admin); *(Since S10 the tabs are All · New lead · Contacted · Interested · Temporary enrollment · Payment pending · Enrolled · Lost · Unassigned (Admin); a row on Temporary enrollment with every temporary course frozen shows a neutral "Frozen" pill next to the stage.)*
   - the selection bar (Admin);
   - the table.
3. Table columns: (Admin) checkbox · **Student** (bold name / "grade · district") · Phone · Course interest · (Admin) Owner (or a warn "Unassigned" pill) · Stage (pill) · Next follow-up (relative; red when overdue; "None set" or "—") · Source (muted). Rows open the lead. Sorted by next follow-up, then newest.
4. Empty: "No leads here. Try another tab or clear the search."

**Lead (drawer, as the prototype, since S1b / R53):**
- **Header:** name (19px), muted "grade · course"; plain sm "Close"; the **stage dropdown** (S9, R70): the stage pill in its tone with a "▾" chevron (a button, `aria-haspopup="menu"`). It opens a menu in the panel look (surface, line border, 12px radius, shadow) listing the six stages; the current one says "(now)"; disabled options are greyed with their reason under the label (from the server's `stageOptions`, e.g. Enrolled: "Happens automatically when an Admin confirms the sale, or the student pays in the app."; from Payment pending: "Cancel the waiting sale or the held course first"; prospects' Payment pending: "Register the student first"). Picking an option opens its panel at the top of the body. Esc or a click outside closes the menu. Lost leads show a plain Lost pill, the reason and "Reopen lead"; then the Do not contact pill. *S10 (R72):* the menu also lists **Temporary enrollment** (accent); from Temporary enrollment only Payment pending (opens Record sale with the temporary course), Interested (another course) and Lost are enabled. A neutral "Frozen" pill follows the stage pill when every temporary course is frozen.
- **Action row** (open leads): primary sm "Log call", sm "Schedule follow-up", sm "Record sale" (R64), sm "WhatsApp" (wa.me link), danger sm "Mark lost" (disabled with the reason while payment is pending), and sm "Assign" for Admin. Record sale and Mark lost open the same panels as the dropdown. The row wraps at phone width.
- **Body, in order:**
  1. the active inline panel (one at a time);
  2. a facts grid: Student phone, Guardian (name · phone), School, District, Source, Added, Last contact, Owner (a select for Admin). Every cell `min-width: 0`, values wrap (`overflow-wrap: anywhere`); one column below 520px;
  3. **Courses** block (S8c / S9; never inside the facts grid): h3 "Courses", then one `.crm-li` row per course: the title on the left (wraps, `min-width: 0`), on the right the state pill (Enrolled good, Payment pending warn, Interested accent, Trial neutral) and, on held (Payment pending) courses the viewer may cancel, a small "Cancel" link (asks for a reason; the lead returns to Interested); "None yet" when empty; *S10:* a temporary course shows "Temporary" (accent) with a small **Freeze** link, or "Frozen" (neutral) with an **Unfreeze** link; both ask to confirm with an optional reason.
  (The separate Stage select and the "Assign course" button of S8b / S8c are gone: the header dropdown does both.)
  5. "Open follow-ups" list: type, note, due (red if overdue); good sm "Done" and sm "+1 day";
  6. "Sales" list: bill no., course, "amount · method · date"; bill pill and sm "Bill";
  7. "Activity" timeline.
- **Panels:**
  - **Log a call:** What happened? (outcome select), Note, "Schedule next follow-up" checkbox → When and How. Buttons Save call / Cancel.
  - **Schedule follow-up:** Type, Due, Note. Buttons Schedule / Cancel.
  - **Record sale:**
    - fields: Course (with price), Discount (Rs), Paid by, Transaction ID (or "Receipt note (optional)" for cash);
    - "Total **Rs x**", and a warn pill when the discount is over the limit;
    - note "The bill is created now. The sale counts toward your target after an admin checks the payment and verifies it.";
    - buttons Create bill / Cancel.
  - **Stage panels** (S9, R70), each a `.crm-panel` with Save / Cancel: **Move to New lead / Contacted** (a line; from Interested: "The open course(s) on this lead close as "No longer interested"."); **Interested** (Course select: catalog courses the student doesn't already have); **Payment pending**: two big choices side by side (stacked below 520px): "Money received: record sale" (opens Record sale prefilled with the interested course) and "Student will pay later" (then Course, prefilled with the interested course, and an optional Note; holds the course, no access). Both disabled with "Register the student first" on prospects; the first also when a sale already waits. **Temporary enrollment** (S10, R72): Course select (courses the student doesn't have, the interested ones first, marked "(interested)"), Reason (optional), help "The student gets full access now, without paying, until you freeze it or they pay. It is not a sale.", button **Give access now**. Record sale's course list starts with the student's courses: temporary first, then held and interested.
  - **Record sale** course list (S8b): the lead's Payment pending and Interested courses first, then other paid courses, then "Course not confirmed yet".
  - **Mark as lost:** Reason, "Try again later" → Re-engage on. Buttons Mark lost / Cancel.

**Follow-ups:**
1. Header "Follow-ups", subtitle "Every open lead should have one next step with a date".
2. One card with tabs and counts: Overdue (default) · Today · Upcoming · Done.
3. The list: "**Name** · type · phone", the note, then the due time (red on Overdue) or "Done {time} · outcome", plus the owner for Admin.
4. Actions: good sm "Done" opens an inline outcome input ("Outcome, e.g. will pay Friday") with Save / Cancel; sm "+1 day"; sm "Open lead".
5. Empty: "No overdue follow-ups. Good work." / "Nothing here."

**Sales & Bills:**
1. Header: subtitle "Manual sales stay pending until an admin confirms the money arrived. App purchases verify automatically."
2. Three static KPIs:
   - "Verified · {month}" (good; caption "n enrollments");
   - "Waiting verification" (warn; caption "n bills");
   - "Discounts given".
3. One card:
   - tabs with counts: Waiting (Admin default) · Verified · Rejected · All (Sales default);
   - table columns: Bill (bold no.) · Date · Student (accent link to the lead) · Course · Amount (`.num`, bold; "−Rs x disc." under it) · Paid by (method / reference) · (Admin) Salesperson · Status pill · actions;
   - actions: sm "Bill"; Admin on pending rows: good sm "Verify" and danger sm "Reject". Reject turns into an inline "Reason" input + danger "Reject" + "Cancel".
4. Empty: "No bills here."

**Team & Targets** (Sales see only "My target" with the subtitle "Monthly target is 10 × your salary"):
1. Header: subtitle with the target formula; primary "+ Add salesperson".
2. KPIs: Team target · Achieved (good, "p% of target") · Bonus payable so far ("r% after Rs t").
3. Card "Salespeople" with "d of n days gone". Table columns: Salesperson (name / phone) · Salary · Target · Verified sales (amount / "n sales · Rs x pending") · Progress (bar + %) · Needed / day ("Done" when met) · Bonus (amount, or muted "Rs x to go") · Status pill · Active (switch). Inactive rows at 55% opacity.
4. Card "Bonus & discount rules" ("Apply to everyone"), a 2-column form:
   - Bonus starts after (Rs);
   - Bonus rate (%);
   - Bonus is paid on (only above the threshold / all sales);
   - Max discount a salesperson can give (%);
   - a full-width worked-example note.
5. **"Add salesperson" modal:** Full name, Phone, Monthly salary; mini tiles with the resulting target.

**"Add lead" modal:**
- Fields: Student name, Student phone (98XXXXXXXX, validated `^9[678]\d{8}$`), Guardian phone, Guardian name, Course interest, School, District, Source, Assign to (Admin).
- A duplicate-phone error note.
- Note "A first-call follow-up is created for the owner, due in 15 minutes."
- Buttons: Add lead / Cancel.

## 5. Mapping: prototype → our code → S1 change

Paths are in this repo unless marked backend. "S1" is visual only; behaviour stays as approved.

| Prototype element | Our existing piece | What changes in S1 (or later) |
|---|---|---|
| Tokens, Figtree / Sora | shadcn tokens in `src/app/globals.css`, Inter / Space Grotesk via `next/font` in `src/app/layout.tsx` | Add scoped CRM tokens and fonts (CRM layout wrapper). The rest of the panel is untouched. |
| Sidebar group + sub items + count badges | `src/components/dashboard-nav.tsx` ("Sales & CRM" group, `Target` icon), `lib/permissions.ts` | Items per R33: CRM Dashboard · Leads & Students · Sales Pipeline · Follow-ups & Tasks · Sales & Bills · Team & Targets. Add count badges (overdue tasks; pending confirmations for confirmers), which need a small count endpoint or reuse of list totals. Restyling the group only: the rest of the sidebar keeps its current look (R33); see §7. |
| Top bar breadcrumb | global header in `src/app/dashboard/layout.tsx` ("Welcome Back…", Logout) | Add a breadcrumb line inside CRM pages; the global header stays. |
| Page header | CRM page headers (`h1 text-3xl` + icon + subtitle) in each `src/app/dashboard/crm/*/page.tsx` | One shared `CrmPageHeader` with prototype sizes. |
| KPI tile | Sales Team KPI cards (`CardDescription` + `CardTitle text-3xl`) in `crm/team/page.tsx` | Shared `CrmKpi` with tones. |
| Card / card header | shadcn `Card` (`rounded-lg`, `p-6`) | Shared `CrmCard` (radius 14px, 14×16 padding, header divider). |
| Underline tabs with counts | Leads "View" `Select`; Tasks shadcn `Tabs`; lead profile shadcn `Tabs` | Shared `CrmTabs`. Leads views become tabs with counts, which needs counts per view from the backend (see §7). Tasks views and lead profile tabs become underline tabs. |
| Table | shadcn `Table` in Leads, Tasks, Team, Payments, Pending quotes, Code allocation | Restyle (header background, uppercase 11.5px, 10×12 cells, `.sub2` lines). |
| Status pill + tones | `components/crm/crm-ui.tsx` badges (`LeadStatusBadge`, `LeadStageBadge`, `InterestStageBadge`, `DoNotContactBadge`), the quote and rep status maps | One `CrmPill` with tones. Mapping: Lead status Active good, Lost bad. Contact stage New accent, Contact attempted neutral, Contacted neutral, Qualified accent. Opportunity stage Interested / Contacted / Qualified neutral or accent, Quoted accent, Payment pending warn. Outcome Won good, Granted neutral, Lost bad. Do not contact bad. Quote Waiting for approval warn, Active good, others neutral. Payment Completed good, Pending confirmation warn, Rejected / Failed bad, Invalid bad. |
| Progress bar | none | New `CrmBar` (S5). |
| Funnel | none (Pipeline is a board) | New on the CRM Dashboard (S5), over **opportunity stages** plus won / lost, not lead stages. |
| Buttons | shadcn `Button` variants | CRM-scoped classes or wrapper; `good` = Done / Confirm; `danger` = text-red outline. |
| Form fields, `label.f` | shadcn `Input`, `Select`, `Label`, `Textarea` | Restyle inside the CRM wrapper (8px radius, 12.5px muted labels above). |
| Panel (inline form) | dialogs: `ContactDialog`, `CreateTaskDialog`, `LogActivityDialog`, `ReasonDialog`, `CreateQuoteDialog` | Keep the dialogs (behaviour and the outreach gate unchanged). Use the panel look for "Record payment" (S3) on the full-page profile; the others may move inline later without changing behaviour. |
| Drawer | — | S1b (R53): `components/crm/leads/lead-drawer.tsx`, opened over the list by `leads/layout.tsx`; the old profile page is gone. |
| Facts grid | lead profile Overview `Info` cells | Restyle; add Guardian (R34) once the backend has it (S2). |
| Timeline | lead profile Activity `ol` list | Restyle as a timeline with tone dots (outcomes: connected good, policy exception bad, system muted). |
| List rows | lead profile Tasks list, quote rows | Restyle. |
| Selection bar | Leads "Assign {n}" button + `BulkAssignDialog` | Selection bar look, keeping our assign options (round-robin, unassigned, rep) and the reason field. |
| Modal | shadcn `Dialog` | Restyle CRM dialogs (16px radius, header divider, plain Close). |
| Bill + stamp | no admin bill view; backend PDF `services/receiptService.ts` (backend) | S3: an HTML bill view with stamp (Paid / Pending confirmation / Rejected) plus "Download PDF" from the backend receipt (R24). Company details come from the backend `SELLER`, not the prototype's text (R44). |
| Note | `UnverifiedMetricsNotice`, inline help text | Shared `CrmNote` (dashed border). |
| Mini tiles | none | New (S5 "My target", salary dialog). |
| Switch | shadcn `Switch` (contact preferences, rep availability) | Restyle only; rep activation stays the Deactivate dialog (§6). |
| Toast | shadcn toaster (`useToast`) | Keep the toaster; optional CRM styling (dark pill, bottom centre) if it can be scoped. |
| Empty state | `DataState` in `crm-ui.tsx` | Restyle `DataState` (loading, error, empty) to `.empty`. |
| Mobile pill nav | shadcn sidebar off-canvas sheet | Keep the sheet; optionally add a pill row of CRM pages at the top of CRM pages under 880px. |
| Dashboard page | none (`/dashboard/crm` redirects to Leads) | S5: new `crm/dashboard/page.tsx` and the nav item; the redirect target changes. |
| Leads page | `crm/leads/page.tsx` | S1 restyle: toolbar card, tabs with counts, table columns kept (Lead · Courses · Stage · Owner · Last course activity · Next follow-up), plus Source for Admin. |
| Follow-ups page | `crm/tasks/page.tsx` | S1 restyle to tabs with counts and list rows; keep Done (outcome required), Reschedule (with reason) and Cancel. |
| Sales & Bills page | none; Orders & Payments is separate | S3: new `crm/sales/page.tsx`. Its tabs map to Pending confirmation · Confirmed · Rejected · All, over the R26 scope. |
| Team & Targets page | `crm/team/page.tsx` (+ `components/crm/team-panels.tsx`) | S1 restyle of the existing reps table, approvals and code allocation; S5 adds salary, target, progress, bonus, rules card, salary dialog and "My target". |
| ~~Pipeline page~~ | removed in S8 (R66); `/dashboard/crm/pipeline` redirects to Leads | — |

## 6. Prototype behaviours we do NOT copy

From R33 and the other approved rules:

1. ~~**Single lead stage.**~~ *Adopted in S8 (R61): six stages derived from our data (per-course opportunities stay underneath).*
2. ~~**10% Sales discount and a "max discount" setting.**~~ *Adopted in S7 / S8 (R57, R62): 10% default, editable by Super Admin on the rules card; above it the confirmer approves.*
3. ~~**Free-typed discount on "Record sale".**~~ *Adopted in S7 (R57): an editable discount on the list price, computed by the server.*
4. **"Fewest open leads" automatic assignment.** We keep round-robin (§3.2, Phase 2).
5. **"Log call" without the gate**, and its "Wrong number marks the lead lost". The gate stays inside the panel (R1, D13) and shows only when it blocks; a connected outcome moves New lead → Contacted (R63); losing a lead needs Mark lost with a reason.
6. **"Try again later" / re-engage date on lost leads.** Waits for R11.
7. **Admin "verify" of every manual sale and of app purchases.** Only Sales-recorded payments need confirmation (R20); online payments are verified by the gateway; Super Admin offline sales qualify when recorded (D16).
8. **Bill number at recording (`NS-0001`).** R24: an `NS-RCP-…` receipt number is issued only at confirmation; pending payments show a "Waiting confirmation" slip with no number.
9. **Weekly = target ÷ 4, daily = target ÷ 30, calendar months.** R28 / R29: BS months; daily = monthly ÷ days in that BS month; weekly = daily × 7.
10. **Bonus mode "only sales above the threshold".** R30: once the threshold is reached, the bonus is the rate × all of the month's credited net sales. There is no mode switch. Rules are snapshotted per month and editable by Super Admin only.
11. **"Add salesperson" with name, phone and salary, and an Active switch.** Accounts are invited by email (§1.3, D7); salary is set separately by a Super Admin with history (R27); deactivation uses the existing dialog that moves the rep's leads (R8).
12. **Payment methods "Khalti" and "App".** Recordable methods are cash, eSewa (personal), bank transfer and other (R19); app purchases are online gateway payments.
13. **A first-call task due in 15 minutes on every new lead.** Not an approved rule; tasks are created through the normal workflow. A scheduler rule would be Phase 6.
14. **"+1 day" snooze without a reason.** Rescheduling keeps its compare-and-set and optional reason. A "+1 day" shortcut that calls the same reschedule is allowed.
15. **Showing source, guardian and phone everywhere.**
    - Source stays Admin only (§1.6).
    - The lead phone and guardian follow the lead's contact visibility (R34).
    - Bills shown to Admin carry no contact or payment reference (R26, §1.5).
16. **The "View as" role switch, the example data, the fixed "today" and the footer.** Prototype devices only.
17. **The prototype's company address on the bill.** We use the backend `SELLER` details (R44).
18. **Dark mode.** No theme switch for now (R33).

## 7. Gaps: things that don't map to an existing component or endpoint

- **Count badges and tab counts.** The backend returns one total per list request. Per-view counts (leads tabs, follow-up tabs, sidebar badges) need either one request per view or a small counts endpoint. To be decided in S1 (a frontend-only phase), probably one request per view to start.
- **Sidebar styling.** R33 limits the new look to the CRM pages. The CRM group lives in the shared sidebar, so S1 restyles only the group's sub items and badges inside the existing sidebar and leaves the panel's sidebar as is.
- **Funnel, progress bar, mini tiles, stamp, timeline dots:** new CRM components with no shadcn counterpart.
- **CRM Dashboard data** (new leads this month, follow-ups today, overdue, enrolled, verified sales, waiting, target progress, pipeline counts): no endpoint yet. Needs the S4 metrics slice; S5 builds the page.
- **Bill view data:** no admin receipt endpoint yet (S3).
- **"Discounts given" KPI:** only payments with a `pricing` snapshot have discount amounts. Sales-recorded ones will have one from S2; Super Admin offline sales don't.
- **Guardian in search:** the leads search doesn't cover guardian phone until the S2 guardian fields exist.

## R73: prepaid and postpaid bills (2026-11-01)

Replaces the S10 stage option and panel, and the "Student will pay later" choice.

- **Record sale** starts with **Bill type**: "Prepaid: the student has paid" (default) or "Postpaid: the student will pay later". Prepaid shows the payment fields. Postpaid shows only Course, Discount and Note, and has no "Course not confirmed yet".
- **Stage dropdown:** no Temporary enrollment option. Payment pending opens Record sale on Postpaid.
- **Lead with an unpaid postpaid bill:** the Record sale button opens the payment form (Paid by, Transaction ID, Money received on, Screenshot, Note; button "Record payment"), headed by the bill's course and amount.
- **Courses block:** a postpaid course shows Temporary with Freeze, or Frozen with Unfreeze.
- **Leads tabs:** Temporary enrollment appears only while such leads exist (given before R73).
- **Sales & Bills:** a Type column (Prepaid accent, Postpaid warn; "—" for older bills). An unpaid postpaid bill shows "Not paid yet" under Waiting, with Reject or Cancel but no Confirm. The confirm dialog shows the bill type.

## R74: Leads tabs and date filter (2026-11-01)

- **Tabs:** All · Payment pending · Enrolled · Lost · Unassigned (Admin), plus Temporary enrollment while such leads exist. New lead, Contacted and Interested leads are under All, with their stage pill.
- **Toolbar:** From and To date inputs after the salesperson filter, with "Clear dates" when set. They filter the list and the tab counts by the day the lead came in (a backfilled lead: the student's signup day).

## R75: visits and follow-ups (2026-11-01)

- **Courses block:** a course the student only visited shows "Visited" (neutral), last. It doesn't change the stage.
- **Interested panel:** any catalog course, visited ones first and marked "(visited)". Saving confirms it, and the lead becomes Interested.
- **Follow-up:** the button reads "Schedule follow-up", or "Edit follow-up" when one is open (the panel opens filled in, button Save). In Log call the checkbox reads "Update the next follow-up" when one is open.


# R88 manual tests: edit the next follow-up from the Leads table

Deploy the backend and the admin panel together. With an old backend, every row shows "None set", and saving makes a second follow-up that the server refuses.

## Edit an existing follow-up
1. Sales & CRM → Leads. Find a lead whose Next follow-up shows a time. Hover it: it highlights with a ✎.
2. Click it. A small form opens next to the cell with that follow-up's Type, Due and Note filled in. The lead's drawer does **not** open.
3. Change Due to tomorrow 10:00 and press **Save**. "Follow-up updated" appears and the cell shows the new time. Open the lead: Open follow-ups shows the same time, and there is still only one.

## Schedule a new one
1. Find a lead showing "None set" (not Lost). Click it. The form opens with Type Call and Due this time tomorrow.
2. Press **Schedule**. "Follow-up scheduled" appears and the cell shows the time.

## Closing and errors
1. Open the form and press Esc, click outside it, or press Cancel. It closes and nothing changes.
2. Open the form and scroll the table. The form stays next to its cell.
3. Open the same lead's follow-up in two tabs. Save a new time in one, then save a different time in the other. The second tab shows the server's message that the follow-up changed. Refresh and try again.
4. For a lead whose contact is blocked (the drawer's Log call shows why), schedule a Call. The form shows the server's reasons and stays open.

## Who sees what
1. A Lost lead's cell is plain text ("—"), not editable.
2. Sign in as Sales. Only your own leads are listed, and their follow-up cells work the same way.
3. An admin without the follow-up permission sees plain text.
4. An overdue follow-up still shows in red.

# R89 manual tests: staff accounts are out of Sales & CRM

Deploy the backend first. Then, once, for accounts marked as staff before this change (on the server, in the backend folder):

```
npx ts-node -r tsconfig-paths/register src/scripts/crmArchiveStaffLeads.ts --dry-run
npx ts-node -r tsconfig-paths/register src/scripts/crmArchiveStaffLeads.ts --live --expect-leads=<number from the dry run>
```
(On production, add `--i-understand-production` and type the database name when asked.)

## Marking a staff account
1. Sales & CRM → Leads: search for a student who has a lead, ideally one with a follow-up. Note the tab counts.
2. Users → Students: open that student and press **Add as staff**. The message says they're removed from Sales & CRM.
3. Back in Leads: searching for them finds nothing, and the All tab count (and their stage's tab) is one lower. The same as a Sales user who owned the lead.
4. Opening their old lead link (/dashboard/crm/leads/<id>) shows "Lead not found".
5. Sales & CRM → Tasks / Dashboard: their follow-up is not in Today or Overdue.

## Moving back
1. Users → Staff: open them and press **Move back to students**.
2. They're in Leads again, at the same stage and with the same owner. Their old follow-up is not back (schedule a new one if needed).

## Already marked before this change
1. With the script not run yet, a staff account marked earlier still shows in Leads. Run the script (above): it leaves Leads. For a single account you can instead press **Move back to students** and then **Add as staff** again.

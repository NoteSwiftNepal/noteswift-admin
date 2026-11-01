# R75 manual tests: course visits and follow-ups

For the owner, on **dev** only. **Never point the backend or a script at production.** Log in as Rita (`+crm-sales1`, `CrmDemo#2026`).

## 1. Visits

| ✓ | Steps | Expected |
|---|---|---|
| [ ] | As a student with no course, open 2 or 3 course pages. Then open their lead | Stage stays **New lead**. Courses lists each as "Visited". |
| [ ] | Stage pill → Interested | Any course can be chosen; visited ones come first, marked "(visited)". |
| [ ] | Pick a visited course, Save | Stage **Interested**; that course "Interested", the others still "Visited". |
| [ ] | Do the same with a course they never visited, on another lead | Stage Interested. |
| [ ] | Interested → Contacted | The confirmed course closes; the visited ones stay. |
| [ ] | Record sale or a postpaid bill on a visited course | Works; the course counts as confirmed. |

## 2. Follow-ups

| ✓ | Steps | Expected |
|---|---|---|
| [ ] | A lead with no recent visit or enquiry: Schedule follow-up | Saved. No "Nothing to contact them about" message. |
| [ ] | Open the same lead again | The button reads **Edit follow-up**. It opens filled in; change the type, date and note, then Save. There is still one follow-up. |
| [ ] | Log call with a follow-up open | The checkbox reads "Update the next follow-up"; saving changes the existing one. |
| [ ] | Mark the follow-up Done | The button reads Schedule follow-up again. |
| [ ] | A Do not contact lead: schedule a Call | Refused with the reason. |
| [ ] | Log call on a lead with no recent activity | Still blocked: scheduling is free, but the contact rule still applies when you start the call. |

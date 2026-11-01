# R73 manual tests: prepaid and postpaid bills

For the owner, on **dev** only. Tick each box and note anything wrong next to it. **Never point the backend or a script at production.**

## 0. Setup

- [ ] Backend and admin panel from `feature/admin-crm` on the dev database.
- [ ] Two registered students owned by Rita with no course (e.g. "[DEMO] Nabin New" from `seedCrmDemoData.ts --s8b`, and a new signup), logged in on the student web or app.
- [ ] Logins: Rita (`+crm-sales1`), Bikash (`+crm-sales2`), Sita (`+crm-admin1`). Password `CrmDemo#2026`.

## 1. Prepaid (Rita, student 1)

| ✓ | Steps | Expected |
|---|---|---|
| [ ] | Record sale | Bill type is first, on Prepaid. Paid by, Transaction ID, Money received on and Screenshot show. |
| [ ] | Pick a paid course, cash, Record sale | Toast "Prepaid bill created". Stage **Enrolled**; Courses "Enrolled". The student has the course at once. |
| [ ] | Sales & Bills, Waiting | Type **Prepaid**, "Waiting confirmation". Rita's target doesn't count it yet. |
| [ ] | Sita: Confirm | The dialog shows "Prepaid (already enrolled)". Confirmed; a receipt exists; Rita is credited; the student keeps the course. |
| [ ] | Second prepaid bill for another course; Sita rejects it | The student loses that course (the first one stays); the lead returns to Interested if no other course keeps it Enrolled. |

## 2. Postpaid (Rita, student 2)

| ✓ | Steps | Expected |
|---|---|---|
| [ ] | Record sale → Bill type Postpaid | The payment fields disappear; "Course not confirmed yet" is gone. |
| [ ] | Pick a course, Record sale | Toast "Postpaid bill created". Stage **Payment pending**; Courses "Temporary" with Freeze. The student has full access and sees nothing special. |
| [ ] | Sales & Bills, Waiting | Type **Postpaid**, "Not paid yet". Sita sees Reject but no Confirm. |
| [ ] | Stage pill → Payment pending on a fresh lead | Record sale opens on Postpaid. |
| [ ] | Freeze, then Unfreeze | Frozen pill; the student loses and regains the course. The bill doesn't change. |
| [ ] | Student pays: **Record sale** in the drawer | The payment form opens with the course and amount. Enter cash, Record payment. The bill becomes "Waiting confirmation". Record sale hides. |
| [ ] | Sita: Confirm | The dialog shows "Postpaid (temporary access until confirmed)". Stage **Enrolled**; no Temporary label, no Freeze; progress kept. |

## 3. Postpaid that isn't paid

| ✓ | Steps | Expected |
|---|---|---|
| [ ] | New postpaid bill; Sita rejects with a reason | The student loses the course; the lead returns to Interested. |
| [ ] | New postpaid bill; Rita cancels it | The same. |
| [ ] | New postpaid bill; the student buys the course in the app | Within about 2 minutes the bill closes as cancelled and the student stays Enrolled. |
| [ ] | While a bill is unpaid: Mark lost | Refused. |

## 4. Other

- [ ] The stage dropdown has no Temporary enrollment option.
- [ ] Bikash opening Rita's lead by URL is refused.
- [ ] A prospect has no Record sale, and Payment pending is greyed with "Register the student first".
- [ ] Prepaid with "Course not confirmed yet": no course until it's set in Sales & Bills, then the student is enrolled.
- [ ] Phone width (390 px): the Record sale form and the Type column fit, with no page scroll sideways.

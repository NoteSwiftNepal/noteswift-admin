# R83 manual tests: Verify, Record in Tigg, Confirmed

Deploy the backend and the admin panel together (the old admin panel doesn't work with the new backend). Test on staging or with a test student.

## Prepaid bill
1. Sales record a prepaid bill. The student gets the course straight away, the lead shows Payment pending, and the course shows Temporary with Freeze.
2. Freeze it: the student loses access. Unfreeze it.
3. The bill has an invoice number (NS-INV-…) and no receipt number.

## Verify
1. As Admin, Sales & Bills → Waiting: the button says Verify. Verify it.
2. The bill moves to To record in Tigg with the pill "Verified · record in Tigg". The student's course is now permanent (no Freeze) and the lead is Enrolled.
3. As Admin, there is no Record in Tigg button. The receipt PDF isn't offered yet.

## Record in Tigg (Super Admin)
1. Enter the sale in Tigg. In To record in Tigg press Record in Tigg, paste Tigg's receipt number, press Record and confirm.
2. The bill moves to Confirmed with that receipt number. The receipt PDF downloads and shows it.
3. Try the same receipt number on another bill: refused.
4. Leave the field empty: the button stays disabled.
5. Undo on a Confirmed bill: it goes back to To record in Tigg and the receipt number is gone.

## Online payment (Fonepay)
1. Pay for a course in the web app. In Payments the student sees "Receipt being prepared" and can download the tax invoice.
2. The payment appears in To record in Tigg. Record it with a receipt number.
3. The student can now download the receipt.

## Mobile app (needs the new build)
1. Payments shows "Receipt being prepared" and a Download tax invoice button until the receipt number is in, then Download receipt.

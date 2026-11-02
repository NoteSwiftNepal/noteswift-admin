# R80, R81 manual tests: invoices, receipts, credit notes, Tigg, bill editing

Deploy the backend before the admin panel. Test on a copy or with a test student: numbers are never reused.

## Proforma and tax invoice
1. Create a postpaid bill. The bill says Proforma and has no invoice number. The Proforma PDF downloads.
2. Add the payment. The bill gets NS-INV-…; no receipt yet. The Tax invoice PDF shows both AD and BS dates, seller VAT number, buyer, discount, taxable amount, 13% VAT, amount in words and a signature line.
3. Confirm it as a different Admin. It gets RCP-…; the Receipt PDF downloads.
4. Create a prepaid bill. It has NS-INV-… straight away.

## Credit note
1. Reject a prepaid bill. It keeps its invoice number, gets NS-CN-…, and no receipt. The Credit note PDF cites the invoice and the reason.
2. Cancel an unpaid postpaid bill. No credit note.
3. Invalidate a confirmed sale. It gets a credit note.

## Tigg
1. As Admin, open Sales & Bills: a confirmed sale is in To record in Tigg with its invoice and receipt numbers.
2. Click Record. It moves to Recorded in Tigg with your name.
3. Click Undo. It moves back.
4. A Fonepay payment and a Super Admin offline sale above Rs 0 also appear.
5. As Sales, the two Tigg tabs don't show.

## Editing a bill
1. As Sales on your own lead, open the lead's Sales list and press Edit on a waiting bill. Change the method and reference, add buyer PAN, save.
2. On a postpaid bill, change the amount. The discount follows.
3. On a bill with a tax invoice, the amount can't change.
4. A confirmed bill has no Edit.
5. Whoever edited a bill can't confirm it.

## Conversion (after it is run)
1. A converted bill says Add details, is Waiting confirmation, and the lead is Payment pending. Confirm is refused until details are added.
2. Press Add details: the received date can be older than 7 days. Saving issues the tax invoice.

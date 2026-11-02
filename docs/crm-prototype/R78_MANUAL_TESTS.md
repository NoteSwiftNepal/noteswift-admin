# R78, R79 manual tests: course picker, Record sale, Do not contact

Deploy the backend before the admin panel.

## Course picker
1. Open a lead with several courses. "Processing for" shows under the action buttons, with each course's state.
2. Pick a course, close the drawer and open it again. The choice is still there.
3. Open the same lead as another user who can see it. They see the same course.
4. Pick another course. The Sales list shows only that course's bills, and bills with no course.
5. If other bills exist, "All courses (n more)" shows them.

## Record sale
1. Pick a course with no bill and press Record sale. The panel shows that course and it can't be changed.
2. Create a postpaid bill for a course. The lead moves to Payment pending and the student has access.
3. With that course picked, Record sale opens "add payment" for that bill.
4. Pick a different course. Record sale opens a new sale for that course.
5. Student at Temporary enrollment: Record sale is visible.
6. Student with two postpaid bills: pay one. The other stays Payment pending.
7. Prepaid bill waiting for confirmation: with that course picked, Record sale is hidden. With another course picked, it shows.
8. Course the student already has: Record sale is hidden.
9. Pick "No course", press Record sale. The course can be chosen, including "Course not confirmed yet".
10. While a bill with no course waits, Record sale is hidden on every course.

## Do not contact
1. No Do not contact pill or link in the drawer or the Leads table.
2. A lead that had Do not contact can be called, followed up and auto-assigned.
3. Log a call with outcome "Asked not to be contacted". It is recorded, and the lead can still be contacted.
4. A switched-off channel still blocks that channel.

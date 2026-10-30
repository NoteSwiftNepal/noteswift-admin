import { redirect } from "next/navigation";

// The old Leads page (course-page and checkout visits) is replaced by
// Sales & CRM → Leads & Students, where those visits are follow-up signals
// on each lead's course opportunities. Its data is carried over by the CRM
// backfill (backend src/scripts/crmBackfill.ts), which must run before this
// ships to production.
export default function LegacyLeadsPage() {
  redirect("/dashboard/crm/leads?view=recent_signals");
}

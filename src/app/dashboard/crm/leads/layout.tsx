import { Suspense } from "react";
import { LeadsSection } from "@/components/crm/leads/leads-section";

// Sales & CRM → Leads (S1b, R53). The list lives in this layout so that
// /dashboard/crm/leads and /dashboard/crm/leads/[leadId] (the same list with
// that lead's drawer open) share it: opening or closing the drawer changes
// only the URL, never reloads the list, and Back / Forward work.
export default function LeadsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <LeadsSection />
      {children}
    </Suspense>
  );
}

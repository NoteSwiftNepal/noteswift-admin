import { redirect } from "next/navigation";

// The Sales Pipeline page was removed in S8 (R66): its stages live on the
// Leads page and the CRM Dashboard funnel. Old links land on Leads.
export default function PipelineRedirect() {
  redirect("/dashboard/crm/leads");
}

import { Figtree, Sora } from "next/font/google";
import { CrmScope } from "@/components/crm/ui/crm-scope";
import "./crm.css";

// Sales & CRM look (R33, docs/crm-prototype/UI_SPEC.md): the prototype's
// tokens and fonts apply inside this section only. The font variables are
// consumed by crm.css (--crm-font-body / --crm-font-display).
const body = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--crm-font-body" });
const display = Sora({ subsets: ["latin"], weight: ["600", "700"], variable: "--crm-font-display" });

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return <CrmScope fontClassName={`${body.variable} ${display.variable}`}>{children}</CrmScope>;
}

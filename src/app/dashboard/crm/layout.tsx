import localFont from "next/font/local";
import { CrmScope } from "@/components/crm/ui/crm-scope";
import "./crm.css";

// Sales & CRM look (R33, docs/crm-prototype/UI_SPEC.md): the prototype's
// tokens and fonts apply inside this section only. The font variables are
// consumed by crm.css (--crm-font-body / --crm-font-display).
// Served from this repo (variable, Latin; SIL Open Font License): the Google
// font loader failed under Turbopack when Google answered with /l/font?kit= URLs.
const body = localFont({ src: "./fonts/Figtree.woff2", weight: "300 900", display: "swap", variable: "--crm-font-body" });
const display = localFont({ src: "./fonts/Sora.woff2", weight: "100 800", display: "swap", variable: "--crm-font-display" });

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return <CrmScope fontClassName={`${body.variable} ${display.variable}`}>{children}</CrmScope>;
}

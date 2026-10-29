"use client";

// Applies the CRM look to the section and to its overlays. Radix portals
// render into document.body, outside this wrapper, so they would lose the
// scoped tokens; this creates a scoped container at the end of <body> and
// hands it to the ui/* overlays through PortalContainerProvider.
import { useEffect, useState } from "react";
import { PortalContainerProvider } from "@/components/ui/portal-container";

export function CrmScope({ fontClassName, children }: { fontClassName: string; children: React.ReactNode }) {
  const [portal, setPortal] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.createElement("div");
    el.className = `crm-scope crm-portal ${fontClassName}`;
    document.body.appendChild(el);
    setPortal(el);
    return () => {
      el.remove();
    };
  }, [fontClassName]);

  return (
    <PortalContainerProvider value={portal}>
      <div className={`crm-scope crm-page ${fontClassName}`}>{children}</div>
    </PortalContainerProvider>
  );
}

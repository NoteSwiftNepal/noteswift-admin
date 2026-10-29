"use client"

import * as React from "react"

// Where Radix overlays (dialogs, selects, popovers, menus) are portalled.
// Unset everywhere except inside a section that provides its own container
// (Sales & CRM, so its overlays keep the section's scoped tokens and fonts);
// unset means Radix's default, document.body.
const PortalContainerContext = React.createContext<HTMLElement | null>(null)

export const PortalContainerProvider = PortalContainerContext.Provider

export function usePortalContainer(): HTMLElement | undefined {
  return React.useContext(PortalContainerContext) ?? undefined
}

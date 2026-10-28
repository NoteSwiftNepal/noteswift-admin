"use client";

// R2 (backend CRM_IMPLEMENTATION.md): a Super Admin can mark a completed
// transaction as erroneous or invalid. The backend checks the permission,
// requires a reason, writes it once and audits it; it never changes the
// amount or status and never replaces a refund.
import { useState } from "react";
import { Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/context/admin-context";
import { ReasonDialog } from "@/components/crm/crm-ui";
import { API_BASE_URL, createFetchOptions } from "@/config/api";

type Tx = { _id: string; status: string; invalidation?: { at: string; reason?: string; byName?: string } | null };

export function InvalidBadge({ transaction }: { transaction: Tx }) {
  if (!transaction.invalidation?.at) return null;
  const when = new Date(transaction.invalidation.at).toLocaleDateString();
  return (
    <Badge variant="destructive" className="ml-1" title={`Marked invalid on ${when}${transaction.invalidation.reason ? `: ${transaction.invalidation.reason}` : ""}`}>
      Invalid
    </Badge>
  );
}

export function InvalidateTransactionButton({ transaction, onDone }: { transaction: Tx; onDone: () => void }) {
  const { can } = useAdmin();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  if (!can("transactions.invalidate") || transaction.status !== "completed" || transaction.invalidation?.at) return null;
  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)} title="Mark as invalid">
        <Ban className="h-4 w-4" />
        <span className="sr-only">Mark as invalid</span>
      </Button>
      <ReasonDialog
        open={open}
        onOpenChange={setOpen}
        title="Mark this transaction invalid"
        description="Only for a transaction that is genuinely wrong, such as a test payment or a sale recorded by mistake. It stops counting as a sale or revenue; the amount, status and history stay as they are, and course access is not changed. This can't be undone. Real money returned to a buyer is a refund, not this."
        confirmLabel="Mark invalid"
        destructive
        onConfirm={async (reason) => {
          const res = await fetch(`${API_BASE_URL}/api/admin/orders-payments/transactions/${transaction._id}/invalidate`, createFetchOptions("POST", { reason }));
          const json = await res.json().catch(() => null);
          if (!res.ok || !json?.success) throw new Error(json?.message || `Request failed (${res.status})`);
          toast({ title: "Transaction marked invalid" });
          onDone();
        }}
      />
    </>
  );
}

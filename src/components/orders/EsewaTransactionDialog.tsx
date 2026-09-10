import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface EsewaTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: any | null;
  courseMap: Record<string, string>;
}

function gatewayStatusVariant(status?: string) {
  if (status === "COMPLETE") return "default";
  if (status === "PENDING" || status === "AMBIGUOUS") return "secondary";
  return "destructive";
}

// Support/dispute-investigation view — the raw eSewa status-check response
// and every verify attempt made against this transaction, so a support
// agent doesn't need database access to answer "what actually happened".
export function EsewaTransactionDialog({ open, onOpenChange, transaction, courseMap }: EsewaTransactionDialogProps) {
  if (!transaction) return null;

  const courseLabel = courseMap[transaction.courseId]
    ? `${courseMap[transaction.courseId]} (${transaction.courseId})`
    : transaction.courseId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>eSewa Transaction Details</DialogTitle>
          <DialogDescription>Payment gateway record and verification history</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Buyer</Label>
              <p className="text-sm mt-1">{transaction.buyerName}</p>
              <p className="text-xs text-muted-foreground">{transaction.contact}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Course</Label>
              <p className="text-sm mt-1">{courseLabel}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Amount</Label>
              <p className="text-sm mt-1">Rs. {transaction.amount}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <div className="mt-1">
                <Badge variant={transaction.status === "completed" ? "default" : transaction.status === "failed" || transaction.status === "cancelled" ? "destructive" : "secondary"}>
                  {transaction.status}
                </Badge>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Transaction UUID</Label>
              <p className="text-xs font-mono mt-1 break-all">{transaction.transactionUuid || "—"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">eSewa Ref ID</Label>
              <p className="text-xs font-mono mt-1 break-all">{transaction.esewaRefId || "—"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Gateway Status</Label>
              <div className="mt-1">
                {transaction.gatewayStatus ? (
                  <Badge variant={gatewayStatusVariant(transaction.gatewayStatus)}>{transaction.gatewayStatus}</Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Initiated / Verified</Label>
              <p className="text-xs mt-1">
                {transaction.gatewayInitiatedAt ? new Date(transaction.gatewayInitiatedAt).toLocaleString() : "—"}
                {" / "}
                {transaction.gatewayVerifiedAt ? new Date(transaction.gatewayVerifiedAt).toLocaleString() : "—"}
              </p>
            </div>
          </div>

          {transaction.gatewayVerifyAttempts?.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Verify Attempts</Label>
              <div className="mt-1 space-y-1">
                {transaction.gatewayVerifyAttempts.map((attempt: any, i: number) => (
                  <div key={i} className="text-xs flex justify-between border-b py-1">
                    <span>{new Date(attempt.at).toLocaleString()}</span>
                    <span className="font-mono">{attempt.result}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {transaction.gatewayRawStatusResponse && (
            <div>
              <Label className="text-sm font-medium">Raw eSewa Status Response</Label>
              <pre className="mt-1 p-3 bg-gray-50 rounded-md text-xs overflow-x-auto">
                {JSON.stringify(transaction.gatewayRawStatusResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

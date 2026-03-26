import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code: any | null;
  loading: boolean;
  courseMap: Record<string, string>;
  formatIssuerInfo: (issuedByAdminId: string, issuedByRole: string) => string;
}

export function CodeDialog({ open, onOpenChange, code, loading, courseMap, formatIssuerInfo }: CodeDialogProps) {
  const { toast } = useToast();

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-sm text-muted-foreground">Loading code details...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!code) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Unlock Code & Transaction Details</DialogTitle>
          <DialogDescription>
            Complete details of the unlock code and associated transaction
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Unlock Code Display */}
          <div>
            <Label className="text-sm font-medium">Unlock Code</Label>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-lg font-mono font-bold">{code.code}</p>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(code.code);
                  toast({
                    title: "Copied!",
                    description: "Code copied to clipboard",
                  });
                }}
                size="sm"
                variant="outline"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
            </div>
          </div>

          {/* Code Information */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Course</Label>
              <p className="text-sm">
                {courseMap[code.courseId] 
                  ? `${courseMap[code.courseId]} (${code.courseId})` 
                  : code.courseId}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <div className="mt-1">
                <Badge variant={code.isUsed ? "secondary" : "default"}>
                  {code.isUsed ? "Used" : "Unused"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Issued To</Label>
              <p className="text-sm">{code.issuedTo}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Issued By</Label>
              <p className="text-sm">
                {code.issuedByAdminId && code.issuedByRole 
                  ? formatIssuerInfo(code.issuedByAdminId, code.issuedByRole) 
                  : 'Unknown'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Expires On</Label>
              <p className="text-sm">
                {code.expiresOn ? new Date(code.expiresOn).toLocaleString() : 'Never'}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Created</Label>
              <p className="text-sm">{new Date(code.createdAt).toLocaleString()}</p>
            </div>
          </div>

          {code.isUsed && (
            <>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Used By User ID</Label>
                  <p className="text-sm font-mono">{code.usedByUserId || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Used At</Label>
                  <p className="text-sm">
                    {code.usedTimestamp ? new Date(code.usedTimestamp).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>
              {code.usedDeviceHash && (
                <div>
                  <Label className="text-sm font-medium">Device Hash</Label>
                  <p className="text-sm font-mono break-all">{code.usedDeviceHash}</p>
                </div>
              )}
            </>
          )}

          {/* Transaction Details */}
          {code.transaction && (
            <>
              <div className="border-t pt-4">
                <Label className="text-sm font-medium text-muted-foreground">TRANSACTION DETAILS</Label>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Buyer Name</Label>
                  <p className="text-sm">{code.transaction.buyerName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Contact</Label>
                  <p className="text-sm">{code.transaction.contact}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Payment Method</Label>
                  <p className="text-sm">{code.transaction.paymentMethod}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Amount</Label>
                  <p className="text-sm">Rs. {code.transaction.amount}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Course</Label>
                <p className="text-sm">
                  {courseMap[code.transaction.courseId] 
                    ? `${courseMap[code.transaction.courseId]} (${code.transaction.courseId})` 
                    : code.transaction.courseId}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Payment Reference Type</Label>
                <p className="text-sm">{code.transaction.paymentReferenceType}</p>
              </div>

              {code.transaction.paymentReferenceType === 'transaction-id' ? (
                <div>
                  <Label className="text-sm font-medium">Transaction ID</Label>
                  <p className="text-sm font-mono">{code.transaction.paymentReference}</p>
                </div>
              ) : (
                <div>
                  <Label className="text-sm font-medium">Payment Screenshot</Label>
                  {code.transaction.paymentReference?.startsWith('data:') ? (
                    <img
                      src={code.transaction.paymentReference}
                      alt="Payment Screenshot"
                      className="max-w-full h-auto mt-2 rounded border"
                      loading="lazy"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">Screenshot not available</p>
                  )}
                </div>
              )}

              {code.transaction.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm">{code.transaction.notes}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Transaction Status</Label>
                  <div className="mt-1">
                    <Badge variant="secondary">{code.transaction.status}</Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Transaction Created</Label>
                  <p className="text-sm">{new Date(code.transaction.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

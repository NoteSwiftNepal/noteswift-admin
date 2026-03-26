import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface Transaction {
  _id: string;
  buyerName: string;
  contact: string;
  courseId: string;
  paymentMethod: string;
  amount: number;
  status: string;
  paymentReferenceType: string;
  paymentReference?: string;
  notes?: string;
  createdAt: string;
  unlockCodeId?: string;
}

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
}

export function TransactionDialog({ open, onOpenChange, transaction }: TransactionDialogProps) {
  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
          <DialogDescription>
            Complete details of the offline payment transaction
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Buyer Name</Label>
              <p className="text-sm">{transaction.buyerName}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Contact</Label>
              <p className="text-sm">{transaction.contact}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Payment Method</Label>
              <p className="text-sm">{transaction.paymentMethod}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Amount</Label>
              <p className="text-sm">Rs. {transaction.amount}</p>
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium">Course ID</Label>
            <p className="text-sm">{transaction.courseId}</p>
          </div>
          
          <div>
            <Label className="text-sm font-medium">Payment Reference Type</Label>
            <p className="text-sm">{transaction.paymentReferenceType}</p>
          </div>
          
          {transaction.paymentReferenceType === 'transaction-id' ? (
            <div>
              <Label className="text-sm font-medium">Transaction ID</Label>
              <p className="text-sm font-mono">{transaction.paymentReference}</p>
            </div>
          ) : (
            <div>
              <Label className="text-sm font-medium">Payment Screenshot</Label>
              {transaction.paymentReference?.startsWith('data:') ? (
                <img
                  src={transaction.paymentReference}
                  alt="Payment Screenshot"
                  className="max-w-full h-auto mt-2 rounded border"
                  loading="lazy"
                />
              ) : (
                <p className="text-sm text-muted-foreground">Screenshot not available</p>
              )}
            </div>
          )}
          
          {transaction.notes && (
            <div>
              <Label className="text-sm font-medium">Notes</Label>
              <p className="text-sm">{transaction.notes}</p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <Badge variant="secondary">{transaction.status}</Badge>
            </div>
            <div>
              <Label className="text-sm font-medium">Created</Label>
              <p className="text-sm">{new Date(transaction.createdAt).toLocaleString()}</p>
            </div>
          </div>
          
          {transaction.unlockCodeId && (
            <div>
              <Label className="text-sm font-medium">Unlock Code ID</Label>
              <p className="text-sm font-mono">{transaction.unlockCodeId}</p>
              <p className="text-xs text-muted-foreground mt-1">
                The unlock code was generated and provided to the buyer when this transaction was created.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

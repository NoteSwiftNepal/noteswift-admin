import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

interface Transaction {
  _id: string;
  buyerName: string;
  contact: string;
  courseId: string;
  paymentMethod: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface TransactionsTableProps {
  transactions: Transaction[];
  loading: boolean;
  courseMap: Record<string, string>;
  onViewTransaction: (transaction: Transaction) => void;
}

export function TransactionsTable({ transactions, loading, courseMap, onViewTransaction }: TransactionsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Buyer</TableHead>
          <TableHead>Course</TableHead>
          <TableHead>Payment Method</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                Loading transactions...
              </div>
            </TableCell>
          </TableRow>
        ) : transactions.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
              No transactions found
            </TableCell>
          </TableRow>
        ) : (
          transactions.map((transaction) => (
            <TableRow key={transaction._id}>
              <TableCell>
                <div className="font-medium">{transaction.buyerName}</div>
                <div className="text-sm text-muted-foreground">{transaction.contact}</div>
              </TableCell>
              <TableCell>
                {courseMap[transaction.courseId] 
                  ? `${courseMap[transaction.courseId]} (${transaction.courseId})` 
                  : transaction.courseId}
              </TableCell>
              <TableCell>{transaction.paymentMethod}</TableCell>
              <TableCell>Rs. {transaction.amount}</TableCell>
              <TableCell>
                <Badge variant="secondary">{transaction.status}</Badge>
              </TableCell>
              <TableCell>{new Date(transaction.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" onClick={() => onViewTransaction(transaction)}>
                  <Eye className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

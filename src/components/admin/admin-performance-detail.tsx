'use client';

import { useEffect, useRef, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Loader2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/context/admin-context";
import { cn } from "@/lib/utils";

interface AmountChange {
  previousAmount: number;
  newAmount: number;
  note?: string;
  updatedByName?: string;
  at: string;
}

type CodeStatus = 'used' | 'unused' | 'expired';

interface AdminTransaction {
  _id: string;
  buyerName: string;
  contact: string;
  courseName: string;
  amount: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  amountHistory: AmountChange[];
  codes: { code: string; status: CodeStatus; student?: string }[];
  directEnrollment?: { student: string; isActive: boolean };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const formatCurrency = (amount: number) => `Rs. ${(Number(amount) || 0).toLocaleString('en-IN')}`;

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

const METHOD_LABELS: Record<string, string> = {
  'esewa-personal': 'eSewa',
  'bank-transfer': 'Bank transfer',
  cash: 'Cash',
  other: 'Other',
};

const STATUS_TEXT: Record<CodeStatus, string> = {
  used: 'text-emerald-700',
  unused: 'text-gray-500',
  expired: 'text-red-600',
};

function CodeLine({ c }: { c: AdminTransaction['codes'][number] }) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap text-xs">
      <span className="font-mono text-gray-900">{c.code}</span>
      <span className={cn("capitalize", STATUS_TEXT[c.status])}>{c.status}</span>
      {c.student && <span className="text-gray-500">by {c.student}</span>}
    </div>
  );
}

function AccessCell({ t }: { t: AdminTransaction }) {
  // No unlock code means the admin enrolled the student directly
  if (!t.codes.length) {
    const removed = t.directEnrollment && !t.directEnrollment.isActive;
    return (
      <div className="text-xs">
        <span className="text-gray-900">Direct enrollment</span>
        {removed && <span className="text-red-600"> (removed)</span>}
      </div>
    );
  }
  if (t.codes.length === 1) return <CodeLine c={t.codes[0]} />;

  const used = t.codes.filter((c) => c.status === 'used').length;
  return (
    <details className="group text-xs">
      <summary className="cursor-pointer list-none text-gray-900 hover:text-blue-600">
        {t.codes.length} codes, {used} used
        <span className="ml-1 text-gray-400 group-open:hidden">Show</span>
        <span className="ml-1 hidden text-gray-400 group-open:inline">Hide</span>
      </summary>
      <div className="mt-2 flex max-h-56 flex-col gap-1.5 overflow-y-auto border-l border-gray-200 pl-3">
        {t.codes.map((c) => <CodeLine key={c.code} c={c} />)}
      </div>
    </details>
  );
}

export function AdminPerformanceDetail({
  adminId,
  period,
  refreshKey,
  onAmountUpdated,
}: {
  adminId: string;
  period: string;
  refreshKey: number;
  onAmountUpdated: () => void;
}) {
  const { toast } = useToast();
  const { admin } = useAdmin();
  // Backend enforces the same rule; this just hides edit controls on other admins' sales
  const canEdit = admin?._id === adminId;
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<AdminTransaction | null>(null);
  const [historyOf, setHistoryOf] = useState<AdminTransaction | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Only the latest request may write state, so a slow response for a
  // previously selected admin/period can't land under the current one
  const latestRequest = useRef(0);

  const fetchTransactions = async (targetPage = page) => {
    const requestId = ++latestRequest.current;
    try {
      setLoading(true);
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(
        `${API_ENDPOINTS.ADMINS.PERFORMANCE_TRANSACTIONS(adminId)}?period=${period}&page=${targetPage}&limit=25`,
        createFetchOptions('GET')
      );
      const result = await response.json();
      if (requestId !== latestRequest.current) return;
      if (!response.ok || !result.success) throw new Error(result.message || 'Request failed');
      // Normalise array fields so an older/partial backend response can't crash the table
      setTransactions((result.data?.transactions ?? []).map((t: any) => ({
        ...t,
        amount: Number(t.amount) || 0,
        codes: Array.isArray(t.codes) ? t.codes : [],
        amountHistory: Array.isArray(t.amountHistory) ? t.amountHistory : [],
      })));
      setPagination(result.data?.pagination ?? null);
      setPage(targetPage);
    } catch (error) {
      if (requestId !== latestRequest.current) return;
      console.error('Failed to fetch admin transactions:', error);
      toast({ title: "Error", description: "Failed to load this admin's transactions", variant: "destructive" });
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(1);
  }, [adminId, period, refreshKey]);

  const openEdit = (t: AdminTransaction) => {
    setEditing(t);
    setAmount(String(t.amount ?? 0));
    setNote('');
  };

  const parsedAmount = Number(amount);
  const amountValid = amount.trim() !== '' && Number.isFinite(parsedAmount) && parsedAmount >= 0;
  const amountChanged = !!editing && parsedAmount !== editing.amount;

  const handleSave = async () => {
    if (!editing || !amountValid || !amountChanged) return;
    try {
      setSaving(true);
      const { API_ENDPOINTS, createFetchOptions } = await import('@/config/api');
      const response = await fetch(
        API_ENDPOINTS.ADMINS.UPDATE_TRANSACTION_AMOUNT(editing._id),
        createFetchOptions('PATCH', { amount: parsedAmount, note })
      );
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Update failed');

      toast({
        title: "Amount updated",
        description: `${editing.buyerName}: ${formatCurrency(editing.amount)} to ${formatCurrency(parsedAmount)}`,
      });
      setTransactions((prev) =>
        prev.map((t) => (t._id === editing._id ? { ...t, amount: parsedAmount, amountHistory: result.data.amountHistory } : t))
      );
      setEditing(null);
      onAmountUpdated();
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to update amount", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="font-medium text-gray-900">Transactions</h2>
        <span className="text-sm text-gray-500">
          {!canEdit && 'View only. Only the admin who recorded a sale can edit it. '}
          {pagination && `${pagination.total} total`}
        </span>
      </div>

      {loading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Date</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  {canEdit && <TableHead className="w-12 pr-4"><span className="sr-only">Edit</span></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={canEdit ? 6 : 5}className="py-12 text-center text-sm text-gray-500">
                      No transactions in this period.
                    </TableCell>
                  </TableRow>
                ) : transactions.map((t) => {
                  const cancelled = t.status === 'cancelled';
                  return (
                    <TableRow key={t._id} className={cn("align-top", cancelled && "opacity-50")}>
                      <TableCell className="whitespace-nowrap pl-4">
                        <div className="text-sm text-gray-900">{formatDate(t.createdAt)}</div>
                        <div className="text-xs text-gray-500">{formatTime(t.createdAt)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-gray-900">{t.buyerName}</div>
                        <div className="text-xs text-gray-500">{t.contact}</div>
                      </TableCell>
                      <TableCell className="max-w-[220px] text-sm text-gray-700">{t.courseName}</TableCell>
                      <TableCell>
                        <AccessCell t={t} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <div className={cn("text-sm font-medium tabular-nums", t.amount === 0 ? "text-amber-600" : "text-gray-900")}>
                          {formatCurrency(t.amount)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {cancelled ? 'Cancelled' : METHOD_LABELS[t.paymentMethod] || t.paymentMethod}
                          {t.amountHistory.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setHistoryOf(t)}
                              className="ml-1.5 text-blue-600 hover:underline"
                            >
                              Edited
                            </button>
                          )}
                        </div>
                      </TableCell>
                      {canEdit && (
                        <TableCell className="pr-4 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-gray-500 hover:text-gray-900"
                            disabled={cancelled}
                            onClick={() => openEdit(t)}
                            aria-label={`Edit amount for ${t.buyerName}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
              <p className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages}</p>
              <div className="flex gap-1">
                <Button size="icon" variant="outline" className="h-8 w-8" disabled={page <= 1} onClick={() => fetchTransactions(page - 1)} aria-label="Previous page">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" className="h-8 w-8" disabled={page >= pagination.pages} onClick={() => fetchTransactions(page + 1)} aria-label="Next page">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit amount */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && !saving && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit amount</DialogTitle>
            <DialogDescription>
              {editing && `${editing.buyerName}, ${editing.courseName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-baseline justify-between rounded-lg bg-gray-50 px-3 py-2.5 text-sm">
              <span className="text-gray-500">Current amount</span>
              <span className="font-medium tabular-nums text-gray-900">{editing && formatCurrency(editing.amount)}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-amount">New amount (Rs.)</Label>
              <Input
                id="new-amount"
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {!amountValid && <p className="text-xs text-red-600">Enter an amount of 0 or more.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount-note">Note (optional)</Label>
              <Textarea
                id="amount-note"
                placeholder="Paid the remaining fee in cash"
                maxLength={500}
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <p className="text-xs text-gray-500">The original sale stays in the audit log. This change is logged separately.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !amountValid || !amountChanged}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Amount history */}
      <Dialog open={!!historyOf} onOpenChange={(open) => !open && setHistoryOf(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Amount history</DialogTitle>
            <DialogDescription>{historyOf && `${historyOf.buyerName}, ${historyOf.courseName}`}</DialogDescription>
          </DialogHeader>
          <ol className="space-y-4 border-l border-gray-200 pl-4">
            {historyOf?.amountHistory.slice().reverse().map((h, i) => (
              <li key={i} className="text-sm">
                <div className="font-medium tabular-nums text-gray-900">
                  {formatCurrency(h.previousAmount)} to {formatCurrency(h.newAmount)}
                </div>
                <div className="text-xs text-gray-500">
                  {h.updatedByName || 'Admin'}, {formatDate(h.at)} at {formatTime(h.at)}
                </div>
                {h.note && <p className="mt-1 text-sm text-gray-700">{h.note}</p>}
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>
    </div>
  );
}

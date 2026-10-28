"use client";

// Sales Team page, Phase 4: quotes waiting for discount approval, and
// unlock-code allocation to Sales reps (crm.allocate_codes). Allocation is
// custody only: the sale stays the code's own record and credit follows the
// lead owner at redemption. Plaintext codes are never sent to the panel.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { DataState, ReasonDialog } from "@/components/crm/crm-ui";
import { CodeRow, Quote, Rep, crmApi, fmtDateTime, rs } from "@/lib/crm/api";

export function PendingQuotesCard() {
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Quote | null>(null);
  const load = useCallback(async () => {
    setError(null);
    try {
      setQuotes(await crmApi.pendingQuotes());
    } catch (e: any) {
      setError(e?.message || "Could not load quotes");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Discounts waiting for approval</CardTitle>
        <CardDescription>Discounted quotes. Nobody can approve or reject their own quote.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <DataState loading={loading} error={error} onRetry={load} empty={quotes.length === 0} emptyText="Nothing to approve.">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((q) => (
                  <TableRow key={q._id}>
                    <TableCell>
                      <Link href={`/dashboard/crm/leads/${q.leadId}`} className="hover:underline">
                        Open lead
                      </Link>
                    </TableCell>
                    <TableCell>
                      {rs(q.price.total)} <span className="text-xs text-muted-foreground">({q.discountPercent}% off {rs(q.price.listPrice)}, limit {q.approval.limitPercent}%)</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{fmtDateTime(q.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      {!q.canDecide ? (
                        <span className="text-xs text-muted-foreground">Your quote: another approver decides</span>
                      ) : (
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() =>
                            crmApi.decideQuote(q._id, true).then(
                              () => (toast({ title: "Approved" }), load()),
                              (e) => toast({ title: "Not done", description: e?.message, variant: "destructive" })
                            )
                          }
                        >
                          Approve
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => setRejecting(q)}>
                          Reject
                        </Button>
                      </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DataState>
      </CardContent>
      <ReasonDialog
        open={!!rejecting}
        onOpenChange={(v) => !v && setRejecting(null)}
        title="Reject the discount"
        confirmLabel="Reject"
        destructive
        onConfirm={async (r) => {
          await crmApi.decideQuote(rejecting!._id, false, r);
          toast({ title: "Rejected" });
          load();
        }}
      />
    </Card>
  );
}

export function CodeAllocationCard({ reps, courses }: { reps: Rep[]; courses: { _id: string; title: string }[] }) {
  const { toast } = useToast();
  const [courseId, setCourseId] = useState("any");
  const [view, setView] = useState("unallocated"); // or a rep id
  const [rows, setRows] = useState<CodeRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [revoking, setRevoking] = useState<CodeRow | null>(null);
  const active = reps.filter((r) => r.status === "active");

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      setRows(await crmApi.codesForAllocation({ courseId: courseId === "any" ? undefined : courseId, allocatedTo: view === "unallocated" ? undefined : view }));
      setSelected(new Set());
    } catch (e: any) {
      setError(e?.message || "Could not load codes");
    } finally {
      setLoading(false);
    }
  }, [courseId, view]);
  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string, on: boolean) => {
    const next = new Set(selected);
    if (on) next.add(id);
    else next.delete(id);
    setSelected(next);
  };
  const allocate = async () => {
    setBusy(true);
    try {
      const res = await crmApi.allocateCodes(Array.from(selected), target);
      toast({ title: `${res.allocated.length} code(s) allocated`, description: res.skipped.length ? `${res.skipped.length} skipped: ${res.skipped.map((s) => s.reason).join(", ")}` : undefined });
      await load();
    } catch (e: any) {
      toast({ title: "Not done", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Unlock codes for Sales</CardTitle>
        <CardDescription>Give existing unused codes to a rep, who can then enroll their own leads with them. Codes from an invalid or unfinished sale can&apos;t be allocated.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <Select value={view} onValueChange={setView}>
            <SelectTrigger className="w-full sm:w-[220px]" aria-label="Show">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unallocated">Not allocated</SelectItem>
              {active.map((r) => (
                <SelectItem key={r._id} value={r._id}>
                  Allocated to {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger className="w-full sm:w-[240px]" aria-label="Course">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any course</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {view === "unallocated" && (
          <div className="flex flex-wrap items-center gap-3">
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger className="w-full sm:w-[220px]" aria-label="Allocate to">
                <SelectValue placeholder="Allocate to…" />
              </SelectTrigger>
              <SelectContent>
                {active.map((r) => (
                  <SelectItem key={r._id} value={r._id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" onClick={allocate} disabled={busy || !target || selected.size === 0}>
              Allocate {selected.size || ""}
            </Button>
          </div>
        )}
        <DataState loading={loading} error={error} onRetry={load} empty={rows.length === 0} emptyText="No codes here.">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {view === "unallocated" && <TableHead className="w-10"><span className="sr-only">Select</span></TableHead>}
                  <TableHead>Code</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Expires</TableHead>
                  {view !== "unallocated" && <TableHead className="text-right">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c._id}>
                    {view === "unallocated" && (
                      <TableCell>
                        <Checkbox checked={selected.has(c._id)} onCheckedChange={(v) => toggle(c._id, v === true)} aria-label={`Select code ending ${c.last4}`} />
                      </TableCell>
                    )}
                    <TableCell className="font-mono text-xs">…{c.last4 || "????"}</TableCell>
                    <TableCell>{c.courseTitle || c.courseId}</TableCell>
                    <TableCell>{c.kind === "prepaid_batch" ? "Prepaid organization batch" : "Single sale"}</TableCell>
                    <TableCell className="whitespace-nowrap">{c.expiresOn ? new Date(c.expiresOn).toLocaleDateString() : "—"}</TableCell>
                    {view !== "unallocated" && (
                      <TableCell className="text-right">
                        <Button type="button" size="sm" variant="ghost" onClick={() => setRevoking(c)}>
                          Take back
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DataState>
      </CardContent>
      <ReasonDialog
        open={!!revoking}
        onOpenChange={(v) => !v && setRevoking(null)}
        title="Take the code back"
        confirmLabel="Take back"
        onConfirm={async (r) => {
          await crmApi.revokeCode(revoking!._id, r);
          toast({ title: "Code taken back" });
          load();
        }}
      />
    </Card>
  );
}

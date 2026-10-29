"use client";

// Sales & CRM → Leads & Students. The backend returns only leads the admin may
// see (Sales: leads they currently own). Filters live in the URL so they
// survive going into a lead and back.
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Plus, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/context/admin-context";
import { CrmCard, CrmPageHeader, CrmPill, CrmSelectionBar, CrmTable, CrmTabs } from "@/components/crm/ui";
import { ProspectDialog } from "@/components/crm/prospect-dialog";
import { DataState, DoNotContactBadge, InterestStageBadge, LeadStageBadge, LeadStatusBadge } from "@/components/crm/crm-ui";
import { LeadRow, Pagination, Rep, crmApi, fetchCourseCatalog, fmtDateTime, timeAgo } from "@/lib/crm/api";

const VIEWS: { value: string; label: string; adminOnly?: boolean; salesOnly?: boolean }[] = [
  { value: "all", label: "All leads", adminOnly: true },
  { value: "mine", label: "My leads", salesOnly: true },
  { value: "unassigned", label: "Unassigned", adminOnly: true },
  { value: "new", label: "New, not contacted" },
  { value: "recent_signals", label: "Recent course activity" },
  { value: "checkout_abandoned", label: "Abandoned checkout" },
  { value: "overdue_tasks", label: "Overdue follow-ups" },
  { value: "lost", label: "Lost" },
  { value: "do_not_contact", label: "Do not contact" },
];
const ALL = "any";

function LeadsPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const { can } = useAdmin();
  const isAdmin = can("crm.view_all_leads");

  const view = params.get("view") || (isAdmin ? "all" : "mine");
  const page = parseInt(params.get("page") || "1", 10) || 1;
  const filters = { status: params.get("status") || "", stage: params.get("stage") || "", courseId: params.get("courseId") || "", ownerId: params.get("ownerId") || "", q: params.get("q") || "" };

  const [searchInput, setSearchInput] = useState(filters.q);
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<{ _id: string; title: string }[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [prospectOpen, setProspectOpen] = useState(false);

  const setParam = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "" || v === ALL) next.delete(k);
        else next.set(k, v);
      }
      if (!("page" in patch)) next.delete("page");
      router.replace(`/dashboard/crm/leads?${next.toString()}`);
    },
    [params, router]
  );

  // Debounced search.
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput.trim() !== filters.q) setParam({ q: searchInput.trim() || null });
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await crmApi.listLeads({ view, page, limit: 25, ...filters });
      setRows(data.items);
      setPagination(data.pagination);
      setSelected(new Set());
    } catch (e: any) {
      setError(e?.message || "Could not load leads");
    } finally {
      setLoading(false);
    }
  }, [view, page, filters.status, filters.stage, filters.courseId, filters.ownerId, filters.q]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetchCourseCatalog().then(setCourses);
    if (can("crm.manage_reps")) crmApi.reps().then((r) => setReps(r.filter((x) => x.status === "active"))).catch(() => setReps([]));
  }, [can]);

  const views = VIEWS.filter((v) => (isAdmin ? !v.salesOnly : !v.adminOnly));
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r._id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r._id)));

  // Counts per view tab, with the other filters applied: one small request
  // per view (limit 1, pagination.total). Display only; failures show no count.
  const [counts, setCounts] = useState<Record<string, number>>({});
  const viewKey = views.map((v) => v.value).join(",");
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      Promise.all(
        views.map((v) =>
          crmApi
            .listLeads({ view: v.value, page: 1, limit: 1, ...filters })
            .then((d) => [v.value, d.pagination.total] as const)
            .catch(() => null)
        )
      ).then((res) => {
        if (cancelled) return;
        const next: Record<string, number> = {};
        for (const r of res) if (r) next[r[0]] = r[1];
        setCounts(next);
      });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [viewKey, filters.status, filters.stage, filters.courseId, filters.ownerId, filters.q]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-4">
      <CrmPageHeader
        crumb="Leads & Students"
        title="Leads & Students"
        subtitle={isAdmin ? "Every lead, and who owns it." : "The leads assigned to you."}
        actions={
          can("crm.create_leads") && (
            <Button type="button" onClick={() => setProspectOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Add prospect
            </Button>
          )
        }
      />

      <CrmCard flush>
        <div className="crm-card-b crm-toolbar">
          <div className="relative min-w-0 flex-[1_1_220px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input aria-label="Search by name, phone or email" placeholder="Name, phone or email" className="pl-8" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          <Select value={filters.stage || ALL} onValueChange={(v) => setParam({ stage: v })}>
            <SelectTrigger className="w-full sm:w-[170px]" aria-label="Contact stage">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any contact stage</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contact_attempted">Contact attempted</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.status || ALL} onValueChange={(v) => setParam({ status: v })}>
            <SelectTrigger className="w-full sm:w-[140px]" aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.courseId || ALL} onValueChange={(v) => setParam({ courseId: v })}>
            <SelectTrigger className="w-full sm:w-[220px]" aria-label="Course">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any course</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && reps.length > 0 && (
            <Select value={filters.ownerId || ALL} onValueChange={(v) => setParam({ ownerId: v })}>
              <SelectTrigger className="w-full sm:w-[180px]" aria-label="Owner">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Any owner</SelectItem>
                <SelectItem value="none">Unassigned</SelectItem>
                {reps.map((r) => (
                  <SelectItem key={r._id} value={r._id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <CrmTabs
          label="View"
          value={view}
          onChange={(v) => setParam({ view: v })}
          tabs={views.map((v) => ({ value: v.value, label: v.label, count: counts[v.value] ?? null }))}
        />
        {isAdmin && selected.size > 0 && (
          <CrmSelectionBar count={selected.size}>
            <Button type="button" size="sm" onClick={() => setBulkOpen(true)}>
              <UserPlus className="mr-1 h-4 w-4" /> Assign…
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </CrmSelectionBar>
        )}
        <DataState loading={loading} error={error} onRetry={load} empty={rows.length === 0} emptyText="No leads match these filters. Try another tab or clear the search.">
          <CrmTable>
            <thead>
              <tr>
                {isAdmin && (
                  <th className="w-10">
                    <Checkbox aria-label="Select all on this page" checked={allSelected} onCheckedChange={toggleAll} />
                  </th>
                )}
                <th>Lead</th>
                <th>Courses</th>
                <th>Stage</th>
                {isAdmin && <th>Owner</th>}
                <th>Last course activity</th>
                <th>Next follow-up</th>
                {isAdmin && <th>Source</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} className="crm-click" onClick={() => router.push(`/dashboard/crm/leads/${r._id}`)}>
                  {isAdmin && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        aria-label={`Select ${r.person?.name || "lead"}`}
                        checked={selected.has(r._id)}
                        onCheckedChange={() =>
                          setSelected((prev) => {
                            const next = new Set(prev);
                            next.has(r._id) ? next.delete(r._id) : next.add(r._id);
                            return next;
                          })
                        }
                      />
                    </td>
                  )}
                  <td>
                    <Link href={`/dashboard/crm/leads/${r._id}`} className="font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
                      {r.person?.name || "Unnamed"}
                    </Link>
                    <span className="crm-sub">{[r.person?.phone, r.person?.email].filter(Boolean).join(" · ") || "No contact details"}</span>
                    {(r.kind === "prospect" || r.doNotContact || r.possibleDuplicate) && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {r.kind === "prospect" && <CrmPill>Prospect</CrmPill>}
                        {r.doNotContact && <DoNotContactBadge />}
                        {r.possibleDuplicate && <CrmPill tone="warn">Possible duplicate</CrmPill>}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="flex max-w-[260px] flex-wrap gap-1">
                      {r.interests.length === 0 ? <span className="crm-muted">—</span> : r.interests.map((i) => <InterestStageBadge key={i._id} stage={i.stage} />)}
                    </div>
                    {r.interests.length > 0 && <span className="crm-sub mt-1">{r.interests.map((i) => i.title).join(", ")}</span>}
                  </td>
                  <td>
                    <div className="flex flex-col items-start gap-1">
                      <LeadStageBadge stage={r.stage} />
                      {r.status !== "active" && <LeadStatusBadge status={r.status} />}
                    </div>
                  </td>
                  {isAdmin && <td>{r.ownerName || <CrmPill tone="warn">Unassigned</CrmPill>}</td>}
                  <td className="whitespace-nowrap">{timeAgo(r.lastSignalAt)}</td>
                  <td className={r.overdue ? "crm-late whitespace-nowrap" : "whitespace-nowrap"}>{r.nextTaskDueAt ? fmtDateTime(r.nextTaskDueAt) : <span className="crm-muted">None set</span>}</td>
                  {isAdmin && <td className="crm-muted">{r.source ? r.source.replace(/_/g, " ") : "—"}</td>}
                </tr>
              ))}
            </tbody>
          </CrmTable>
        </DataState>
      </CrmCard>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setParam({ page: String(page - 1) })}>
            Previous
          </Button>
          <span className="crm-muted crm-small">
            Page {page} of {pagination.pages} · {pagination.total} lead{pagination.total === 1 ? "" : "s"}
          </span>
          <Button type="button" variant="outline" size="sm" disabled={page >= pagination.pages} onClick={() => setParam({ page: String(page + 1) })}>
            Next
          </Button>
        </div>
      )}

      <BulkAssignDialog open={bulkOpen} onOpenChange={setBulkOpen} leadIds={Array.from(selected)} reps={reps} onDone={(msg) => { toast({ title: msg }); load(); }} />
      <ProspectDialog open={prospectOpen} onOpenChange={setProspectOpen} reps={isAdmin ? reps : []} onCreated={(id) => router.push(`/dashboard/crm/leads/${id}`)} />
    </div>
  );
}

function BulkAssignDialog({ open, onOpenChange, leadIds, reps, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; leadIds: string[]; reps: Rep[]; onDone: (msg: string) => void }) {
  const [target, setTarget] = useState("auto");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await crmApi.bulkAssign(leadIds, target === "auto" ? "auto" : target === "none" ? null : target, reason.trim() || undefined);
      onDone(`${r.assigned} assigned${r.failed ? `, ${r.failed} not changed` : ""}`);
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message || "Could not assign");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign {leadIds.length} lead{leadIds.length === 1 ? "" : "s"}</DialogTitle>
          <DialogDescription>Each lead is checked on its own; open tasks move with the lead.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="bulk-target">Assign to</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger id="bulk-target">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automatically (round-robin)</SelectItem>
                <SelectItem value="none">Nobody (unassigned queue)</SelectItem>
                {reps.map((r) => (
                  <SelectItem key={r._id} value={r._id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="bulk-reason">Reason (optional)</Label>
            <Input id="bulk-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={null}>
      <LeadsPageInner />
    </Suspense>
  );
}

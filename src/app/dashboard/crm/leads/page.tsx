"use client";

// Sales & CRM → Leads & Students. The backend returns only leads the admin may
// see (Sales: leads they currently own). Filters live in the URL so they
// survive going into a lead and back.
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Plus, Search, Target, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/context/admin-context";
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold text-gray-900">Leads &amp; Students</h1>
          </div>
          <p className="mt-2 text-gray-600">{isAdmin ? "Every lead, and who owns it." : "The leads assigned to you."}</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && selected.size > 0 && (
            <Button type="button" variant="outline" onClick={() => setBulkOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Assign {selected.size}
            </Button>
          )}
          {can("crm.create_leads") && (
            <Button type="button" onClick={() => setProspectOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add prospect
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>{pagination ? `${pagination.total} lead${pagination.total === 1 ? "" : "s"}` : " "}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input aria-label="Search by name, phone or email" placeholder="Name, phone or email" className="pl-8" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          </div>
          <Select value={view} onValueChange={(v) => setParam({ view: v })}>
            <SelectTrigger className="w-full sm:w-[200px]" aria-label="View">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {views.map((v) => (
                <SelectItem key={v.value} value={v.value}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <DataState loading={loading} error={error} onRetry={load} empty={rows.length === 0} emptyText="No leads match these filters.">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isAdmin && (
                      <TableHead className="w-10">
                        <Checkbox aria-label="Select all on this page" checked={allSelected} onCheckedChange={toggleAll} />
                      </TableHead>
                    )}
                    <TableHead>Lead</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead>Stage</TableHead>
                    {isAdmin && <TableHead>Owner</TableHead>}
                    <TableHead>Last course activity</TableHead>
                    <TableHead>Next follow-up</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r._id} className="cursor-pointer" onClick={() => router.push(`/dashboard/crm/leads/${r._id}`)}>
                      {isAdmin && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
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
                        </TableCell>
                      )}
                      <TableCell>
                        <Link href={`/dashboard/crm/leads/${r._id}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                          {r.person?.name || "Unnamed"}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {[r.person?.phone, r.person?.email].filter(Boolean).join(" · ") || "No contact details"}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {r.kind === "prospect" && <Badge variant="outline">Prospect</Badge>}
                          {r.doNotContact && <DoNotContactBadge />}
                          {r.possibleDuplicate && <Badge variant="outline">Possible duplicate</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-[260px] flex-wrap gap-1">
                          {r.interests.length === 0 ? <span className="text-xs text-muted-foreground">—</span> : r.interests.map((i) => <InterestStageBadge key={i._id} stage={i.stage} />)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{r.interests.map((i) => i.title).join(", ")}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <LeadStageBadge stage={r.stage} />
                          {r.status !== "active" && <LeadStatusBadge status={r.status} />}
                        </div>
                      </TableCell>
                      {isAdmin && <TableCell className="text-sm">{r.ownerName || <span className="text-muted-foreground">Unassigned</span>}</TableCell>}
                      <TableCell className="text-sm">{timeAgo(r.lastSignalAt)}</TableCell>
                      <TableCell className="text-sm">
                        {r.nextTaskDueAt ? <span className={r.overdue ? "font-medium text-red-700" : ""}>{fmtDateTime(r.nextTaskDueAt)}</span> : <span className="text-muted-foreground">None</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DataState>
        </CardContent>
      </Card>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setParam({ page: String(page - 1) })}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pagination.pages}
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
          {error && <p className="text-sm text-red-700">{error}</p>}
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

function ProspectDialog({ open, onOpenChange, reps, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; reps: Rep[]; onCreated: (id: string) => void }) {
  const empty = { name: "", phone: "", email: "", grade: "", school: "", district: "", ownerId: "none" };
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setForm(empty);
      setError(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const field = (k: keyof typeof empty) => ({ value: form[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value }) });
  const valid = useMemo(() => form.name.trim().length >= 2 && (form.phone.trim() || form.email.trim()), [form]);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await crmApi.createProspect({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        grade: form.grade ? Number(form.grade) : undefined,
        school: form.school.trim() || undefined,
        district: form.district.trim() || undefined,
        ownerId: form.ownerId === "none" ? undefined : form.ownerId,
      });
      onOpenChange(false);
      onCreated(r.lead._id);
    } catch (e: any) {
      setError(e?.message || "Could not create");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add prospect</DialogTitle>
          <DialogDescription>Someone who hasn&apos;t registered. When they register with the same phone or email, the lead is linked to their account.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="p-name">Name</Label>
            <Input id="p-name" {...field("name")} maxLength={200} />
          </div>
          <div>
            <Label htmlFor="p-phone">Phone</Label>
            <Input id="p-phone" inputMode="tel" {...field("phone")} maxLength={30} />
          </div>
          <div>
            <Label htmlFor="p-email">Email</Label>
            <Input id="p-email" type="email" {...field("email")} maxLength={200} />
          </div>
          <div>
            <Label htmlFor="p-grade">Grade</Label>
            <Input id="p-grade" type="number" min={1} max={12} {...field("grade")} />
          </div>
          <div>
            <Label htmlFor="p-district">District</Label>
            <Input id="p-district" {...field("district")} maxLength={100} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="p-school">School</Label>
            <Input id="p-school" {...field("school")} maxLength={200} />
          </div>
          {reps.length > 0 && (
            <div className="sm:col-span-2">
              <Label htmlFor="p-owner">Owner</Label>
              <Select value={form.ownerId} onValueChange={(v) => setForm({ ...form, ownerId: v })}>
                <SelectTrigger id="p-owner">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {reps.map((r) => (
                    <SelectItem key={r._id} value={r._id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={busy || !valid}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add
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

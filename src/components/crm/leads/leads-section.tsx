"use client";

// Sales & CRM → Leads (S1b, as the prototype's Leads page) with the lead
// drawer (R53). Rendered by the leads layout, so /dashboard/crm/leads and
// /dashboard/crm/leads/[leadId] share one list: opening and closing the
// drawer only changes the URL. Filters live in the URL too. The backend
// returns only leads the admin may see (Sales: leads they currently own).
import { KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/context/admin-context";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CrmPageHeader, CrmPill } from "@/components/crm/ui";
import { Field, Sel } from "@/components/crm/leads/controls";
import { LeadDrawer } from "@/components/crm/leads/lead-drawer";
import { AddLeadModal } from "@/components/crm/leads/add-lead-modal";
import { DISPLAY_STAGE, LEAD_STAGE_LABELS, LeadRow, LeadView, Pagination, Rep, crmApi, fetchCourseCatalog, relDateTime, sourceLabel } from "@/lib/crm/api";

const BASE = "/dashboard/crm/leads";
const PAGE_SIZE = 25;

export function LeadsSection() {
  const router = useRouter();
  const params = useSearchParams();
  const { leadId } = useParams<{ leadId?: string }>();
  const { toast } = useToast();
  const { can } = useAdmin();
  const isAdmin = can("crm.view_all_leads");

  const views: { value: LeadView; label: string }[] = [
    { value: isAdmin ? "all" : "mine", label: "All" },
    { value: "new", label: "New" },
    { value: "today_tasks", label: "Today's follow-ups" },
    { value: "overdue_tasks", label: "Overdue" },
    { value: "payment_pending", label: "Payment pending" },
    { value: "enrolled", label: "Enrolled" },
    { value: "lost", label: "Lost" },
    ...(isAdmin ? [{ value: "unassigned" as LeadView, label: "Unassigned" }] : []),
    { value: "recent_signals", label: "Recent course activity" },
    { value: "checkout_abandoned", label: "Abandoned checkout" },
    { value: "do_not_contact", label: "Do not contact" },
  ];
  const requested = params.get("view") as LeadView | null;
  const view: LeadView = requested && views.some((v) => v.value === requested) ? requested : views[0].value;
  const page = parseInt(params.get("page") || "1", 10) || 1;
  const filters = { status: params.get("status") || "", stage: params.get("stage") || "", courseId: params.get("courseId") || "", ownerId: params.get("ownerId") || "", q: params.get("q") || "" };
  const filterKey = JSON.stringify(filters);
  const query = params.toString();

  const [searchInput, setSearchInput] = useState(filters.q);
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Partial<Record<LeadView, number>>>({});
  const [courses, setCourses] = useState<{ _id: string; title: string; price?: number }[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkTo, setBulkTo] = useState("");
  const [bulkReason, setBulkReason] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const openedHere = useRef(false);

  const setParam = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "" || v === "any") next.delete(k);
        else next.set(k, v);
      }
      if (!("page" in patch)) next.delete("page");
      const s = next.toString();
      router.replace(`${BASE}${s ? `?${s}` : ""}`, { scroll: false });
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
    setError(null);
    try {
      const data = await crmApi.listLeads({ view, page, limit: PAGE_SIZE, ...filters });
      setRows(data.items);
      setPagination(data.pagination);
    } catch (e: any) {
      setError(e?.message || "Could not load leads");
    } finally {
      setLoading(false);
    }
  }, [view, page, filterKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const loadCounts = useCallback(() => {
    crmApi.leadCounts(filters).then(setCounts, () => setCounts({}));
  }, [filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLoading(true);
    setSelected([]);
    load();
  }, [load]);
  useEffect(() => {
    loadCounts();
  }, [loadCounts]);
  useEffect(() => {
    fetchCourseCatalog().then(setCourses);
    if (can("crm.manage_reps")) crmApi.reps().then(setReps, () => setReps([]));
  }, [can]);

  // The drawer: opening pushes /leads/[id] (Back closes it); closing goes back
  // when we opened it, or replaces the URL after a deep link.
  const openLead = (id: string, el?: HTMLElement | null) => {
    opener.current = el ?? null;
    openedHere.current = true;
    router.push(`${BASE}/${id}${query ? `?${query}` : ""}`, { scroll: false });
  };
  const closeLead = () => {
    if (openedHere.current) router.back();
    else router.replace(`${BASE}${query ? `?${query}` : ""}`, { scroll: false });
  };
  useEffect(() => {
    if (leadId) return;
    openedHere.current = false;
    opener.current?.focus();
  }, [leadId]);
  const refresh = () => {
    load();
    loadCounts();
  };

  const activeReps = reps.filter((r) => r.status === "active");
  const allSelected = rows.length > 0 && rows.every((r) => selected.includes(r._id));
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const moreCount = [filters.stage, filters.status, filters.courseId].filter(Boolean).length;

  const bulkAssign = async () => {
    if (!bulkTo) return;
    setBulkBusy(true);
    try {
      const r = await crmApi.bulkAssign(selected, bulkTo === "auto" ? "auto" : bulkTo === "none" ? null : bulkTo, bulkReason.trim() || undefined);
      toast({ title: `${r.assigned} assigned${r.failed ? `, ${r.failed} not changed` : ""}`, ...(r.failed ? { description: r.results.find((x) => !x.ok)?.error } : {}) });
      setSelected([]);
      setBulkTo("");
      setBulkReason("");
      refresh();
    } catch (e: any) {
      toast({ title: "Not assigned", description: e?.message, variant: "destructive" });
    } finally {
      setBulkBusy(false);
    }
  };

  const rowKey = (e: KeyboardEvent<HTMLTableRowElement>, id: string) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openLead(id, e.currentTarget);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <CrmPageHeader
        crumb="Leads & Students"
        title={isAdmin ? "Leads" : "My leads"}
        subtitle={isAdmin ? "Every student enquiry, with one owner and a next step" : "Students assigned to you"}
        actions={
          can("crm.create_leads") && (
            <button type="button" className="crm-btn primary" onClick={() => setAddOpen(true)}>
              + Add lead
            </button>
          )
        }
      />

      <section className="crm-card">
        <div className="crm-card-b crm-toolbar">
          <input className="crm-input" type="search" placeholder="Search name, phone, school" aria-label="Search leads" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
          {isAdmin && (
            <select className="crm-input" style={{ flex: "0 1 200px" }} aria-label="Owner" value={filters.ownerId || "any"} onChange={(e) => setParam({ ownerId: e.target.value })}>
              <option value="any">All salespeople</option>
              <option value="none">Unassigned</option>
              {reps.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="crm-btn sm">
                More filters{moreCount > 0 && <span className="crm-badge-n">{moreCount}</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="flex w-72 flex-col gap-3">
              <Field label="Contact stage">
                <Sel value={filters.stage} onChange={(e) => setParam({ stage: e.target.value })} options={[{ value: "", label: "Any contact stage" }, ...Object.entries(LEAD_STAGE_LABELS).map(([value, label]) => ({ value, label }))]} />
              </Field>
              <Field label="Status">
                <Sel value={filters.status} onChange={(e) => setParam({ status: e.target.value })} options={[{ value: "", label: "Any status" }, { value: "active", label: "Active" }, { value: "lost", label: "Lost" }]} />
              </Field>
              <Field label="Course">
                <Sel value={filters.courseId} onChange={(e) => setParam({ courseId: e.target.value })} options={[{ value: "", label: "Any course" }, ...courses.map((c) => ({ value: c._id, label: c.title }))]} />
              </Field>
              {moreCount > 0 && (
                <button type="button" className="crm-link crm-small self-start" onClick={() => setParam({ stage: null, status: null, courseId: null })}>
                  Clear these filters
                </button>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <div className="crm-tabs" role="tablist" aria-label="Lead views">
          {views.map((v) => (
            <button key={v.value} type="button" role="tab" aria-selected={view === v.value} className="crm-tab" onClick={() => setParam({ view: v.value === views[0].value ? null : v.value })}>
              {v.label}
              <span className="crm-tab-n">{counts[v.value] ?? "–"}</span>
            </button>
          ))}
        </div>

        {isAdmin && selected.length > 0 && (
          <div className="crm-selbar">
            <b>{selected.length} selected</b>
            <select className="crm-input" style={{ width: "auto" }} aria-label="Assign to" value={bulkTo} onChange={(e) => setBulkTo(e.target.value)}>
              <option value="">Assign to…</option>
              <option value="auto">Round-robin</option>
              <option value="none">Unassigned</option>
              {activeReps.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </select>
            <input className="crm-input" style={{ width: "auto", flex: "0 1 200px" }} placeholder="Reason (optional)" aria-label="Reason" maxLength={500} value={bulkReason} onChange={(e) => setBulkReason(e.target.value)} />
            <button type="button" className="crm-btn primary sm" disabled={!bulkTo || bulkBusy} onClick={bulkAssign}>
              {bulkBusy ? "Assigning…" : "Assign"}
            </button>
            <button type="button" className="crm-btn sm" onClick={() => setSelected([])}>
              Clear
            </button>
          </div>
        )}

        {loading ? (
          <div className="crm-empty flex items-center justify-center gap-2" role="status">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : error ? (
          <div className="crm-empty flex flex-col items-center gap-3" role="alert">
            <span className="crm-late">{error}</span>
            <button type="button" className="crm-btn sm" onClick={refresh}>
              Try again
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="crm-empty">No leads here. Try another tab or clear the search.</div>
        ) : (
          <div className="crm-tw">
            <table className="crm-table">
              <thead>
                <tr>
                  {isAdmin && (
                    <th>
                      <input type="checkbox" aria-label="Select all" checked={allSelected} onChange={() => setSelected(allSelected ? [] : rows.map((r) => r._id))} />
                    </th>
                  )}
                  <th>Student</th>
                  <th>Phone</th>
                  <th>Course interest</th>
                  {isAdmin && <th>Owner</th>}
                  <th>Stage</th>
                  <th>Next follow-up</th>
                  {isAdmin && <th>Source</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const st = DISPLAY_STAGE[r.displayStage] ?? { label: r.displayStage, tone: "neutral" as const };
                  const closed = r.displayStage === "lost" || r.displayStage === "enrolled";
                  const sub = [r.person?.grade ? `Grade ${r.person.grade}` : null, r.person?.district].filter(Boolean).join(" · ");
                  return (
                    <tr key={r._id} className="crm-click" tabIndex={0} aria-label={`Open ${r.person?.name || "lead"}`} onClick={(e) => openLead(r._id, e.currentTarget)} onKeyDown={(e) => rowKey(e, r._id)}>
                      {isAdmin && (
                        <td onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" aria-label={`Select ${r.person?.name || "lead"}`} checked={selected.includes(r._id)} onChange={() => toggle(r._id)} />
                        </td>
                      )}
                      <td>
                        <b>{r.person?.name || "Unnamed"}</b>
                        {sub && <span className="crm-sub">{sub}</span>}
                        {(r.kind === "prospect" || r.doNotContact || r.possibleDuplicate) && (
                          <span className="mt-1 flex flex-wrap gap-1">
                            {r.kind === "prospect" && <CrmPill>Prospect</CrmPill>}
                            {r.doNotContact && <CrmPill tone="bad">Do not contact</CrmPill>}
                            {r.possibleDuplicate && <CrmPill tone="warn">Possible duplicate</CrmPill>}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap">{r.person?.phone || <span className="crm-muted">—</span>}</td>
                      <td>
                        {r.displayCourseTitle ?? <span className="crm-muted">—</span>}
                        {r.otherOpenCourses > 0 && <span className="crm-muted crm-small"> +{r.otherOpenCourses} more</span>}
                      </td>
                      {isAdmin && <td>{r.ownerName || <CrmPill tone="warn">Unassigned</CrmPill>}</td>}
                      <td>
                        <CrmPill tone={st.tone}>{st.label}</CrmPill>
                      </td>
                      <td className={`whitespace-nowrap ${r.overdue ? "crm-late" : ""}`}>{r.nextTaskDueAt ? relDateTime(r.nextTaskDueAt) : <span className="crm-muted">{closed ? "—" : "None set"}</span>}</td>
                      {isAdmin && <td className="crm-muted">{sourceLabel(r)}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.pages > 1 && (
          <div className="crm-pager">
            <span className="crm-muted crm-small">
              Page {page} of {pagination.pages} · {pagination.total} lead{pagination.total === 1 ? "" : "s"}
            </span>
            <button type="button" className="crm-btn sm" disabled={page <= 1} onClick={() => setParam({ page: String(page - 1) })}>
              Previous
            </button>
            <button type="button" className="crm-btn sm" disabled={page >= pagination.pages} onClick={() => setParam({ page: String(page + 1) })}>
              Next
            </button>
          </div>
        )}
      </section>

      {leadId && (
        <>
          <div className="crm-overlay" onClick={closeLead} />
          <LeadDrawer key={leadId} leadId={leadId} reps={reps} courses={courses} onClose={closeLead} onChanged={refresh} />
        </>
      )}
      <AddLeadModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        reps={isAdmin ? activeReps : []}
        courses={courses}
        onCreated={(id) => {
          toast({ title: "Lead added" });
          refresh();
          openLead(id);
        }}
      />
    </div>
  );
}

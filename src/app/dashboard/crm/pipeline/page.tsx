"use client";

// Sales & CRM → Sales Pipeline: open course opportunities by stage. Drag a
// card to another column, or use its "Move to" menu (keyboard friendly).
// The backend validates every move (no manual win; no new moves to "quoted"
// since R54, and its column shows only while opportunities are still there;
// "payment pending" needs a pending course assignment or a recorded sale) and
// answers with the reason when it refuses. Totals are course list prices,
// never revenue.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Columns3, Rows3 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/context/admin-context";
import { DataState, DoNotContactBadge } from "@/components/crm/crm-ui";
import { CrmCard, CrmPageHeader, CrmPill } from "@/components/crm/ui";
import { INTEREST_STAGE_LABELS, InterestStage, Pipeline, PipelineCard, Rep, crmApi, fetchCourseCatalog, rs, timeAgo } from "@/lib/crm/api";

const ANY = "any";
// R54 (S7): nothing moves to "quoted" any more; an opportunity already there can stay.
const moveTargets = (current: InterestStage) => (Object.keys(INTEREST_STAGE_LABELS) as InterestStage[]).filter((st) => st !== "quoted" || current === "quoted");

export default function PipelinePage() {
  const { toast } = useToast();
  const { can } = useAdmin();
  const isAdmin = can("crm.view_all_leads");
  const [data, setData] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"board" | "table">("board");
  const [ownerId, setOwnerId] = useState(ANY);
  const [courseId, setCourseId] = useState(ANY);
  const [reps, setReps] = useState<Rep[]>([]);
  const [courses, setCourses] = useState<{ _id: string; title: string }[]>([]);
  const [dragOver, setDragOver] = useState<InterestStage | null>(null);
  const [moving, setMoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await crmApi.pipeline({ ownerId: ownerId === ANY ? undefined : ownerId, courseId: courseId === ANY ? undefined : courseId }));
    } catch (e: any) {
      setError(e?.message || "Could not load the pipeline");
    } finally {
      setLoading(false);
    }
  }, [ownerId, courseId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);
  useEffect(() => {
    fetchCourseCatalog().then(setCourses);
    if (can("crm.manage_reps")) crmApi.reps().then((r) => setReps(r.filter((x) => x.status === "active"))).catch(() => setReps([]));
  }, [can]);

  const move = async (card: PipelineCard, from: InterestStage, to: InterestStage) => {
    if (from === to) return;
    setMoving(card.interestId);
    try {
      await crmApi.setStage(card.interestId, to, from);
      toast({ title: `Moved to ${INTEREST_STAGE_LABELS[to]}` });
    } catch (e: any) {
      toast({ title: "Not moved", description: e?.message, variant: "destructive" });
    } finally {
      setMoving(null);
      load();
    }
  };

  const rows = (data?.stages || []).flatMap((s) => s.cards.map((c) => ({ ...c, stage: s.stage })));
  const stages = (data?.stages || []).filter((s) => s.stage !== "quoted" || s.count > 0);

  return (
    <div className="flex flex-col gap-4">
      <CrmPageHeader
        crumb="Sales Pipeline"
        title="Sales Pipeline"
        subtitle="Open course opportunities by stage. Values are list prices, not revenue. An opportunity is won only when a payment is verified."
        actions={
          <div className="crm-seg" role="group" aria-label="Layout">
            <button type="button" className={view === "board" ? "on" : ""} onClick={() => setView("board")} aria-pressed={view === "board"}>
              <Columns3 className="mr-1 inline h-4 w-4" /> Board
            </button>
            <button type="button" className={view === "table" ? "on" : ""} onClick={() => setView("table")} aria-pressed={view === "table"}>
              <Rows3 className="mr-1 inline h-4 w-4" /> Table
            </button>
          </div>
        }
      />

      <div className="crm-toolbar">
        {isAdmin && reps.length > 0 && (
          <Select value={ownerId} onValueChange={setOwnerId}>
            <SelectTrigger className="w-full bg-[var(--crm-surface)] sm:w-[200px]" aria-label="Owner">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Any owner</SelectItem>
              <SelectItem value="none">Unassigned</SelectItem>
              {reps.map((r) => (
                <SelectItem key={r._id} value={r._id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger className="w-full bg-[var(--crm-surface)] sm:w-[240px]" aria-label="Course">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any course</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c._id} value={c._id}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataState loading={loading} error={error} onRetry={load} empty={!!data && rows.length === 0} emptyText="No open opportunities.">
        {view === "board" ? (
          <div className="grid gap-4 overflow-x-auto pb-2 md:[grid-template-columns:var(--cols)]" style={{ ["--cols" as any]: `repeat(${stages.length},minmax(220px,1fr))` }}>
            {stages.map((s) => (
              <section
                key={s.stage}
                aria-label={INTEREST_STAGE_LABELS[s.stage]}
                className={`crm-col ${dragOver === s.stage ? "over" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(s.stage);
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(null);
                  const raw = e.dataTransfer.getData("application/json");
                  if (!raw) return;
                  const { card, from } = JSON.parse(raw) as { card: PipelineCard; from: InterestStage };
                  move(card, from, s.stage);
                }}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <h2>{INTEREST_STAGE_LABELS[s.stage]}</h2>
                    <p className="crm-muted crm-small">{rs(s.listPriceTotal)} list price</p>
                  </div>
                  <span className="crm-tab-n !ml-0">{s.count}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {s.cards.map((c) => (
                    <div
                      key={c.interestId}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("application/json", JSON.stringify({ card: c, from: s.stage }))}
                      className={`crm-tile ${moving === c.interestId ? "opacity-50" : ""}`}
                    >
                        <Link href={`/dashboard/crm/leads/${c.leadId}`} className="font-semibold hover:underline">
                          {c.name || "Unnamed"}
                        </Link>
                        <div className="crm-muted text-xs">{c.courseTitle}</div>
                        <div className="crm-muted text-xs">
                          {rs(c.listPrice)} · activity {timeAgo(c.lastSignalAt)}
                        </div>
                        {isAdmin && <div className="text-xs">{c.ownerName || <CrmPill tone="warn">Unassigned</CrmPill>}</div>}
                        {(c.overdue || c.doNotContact) && (
                          <div className="flex flex-wrap gap-1">
                            {c.overdue && <CrmPill tone="bad">Overdue</CrmPill>}
                            {c.doNotContact && <DoNotContactBadge />}
                          </div>
                        )}
                        <Select value={s.stage} onValueChange={(v) => move(c, s.stage, v as InterestStage)}>
                          <SelectTrigger className="mt-1 h-8 bg-[var(--crm-surface)] text-xs" aria-label={`Move ${c.name || "lead"} (${c.courseTitle}) to`}>
                            <SelectValue placeholder="Move to" />
                          </SelectTrigger>
                          <SelectContent>
                            {moveTargets(s.stage).map((st) => (
                              <SelectItem key={st} value={st}>
                                {INTEREST_STAGE_LABELS[st]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                    </div>
                  ))}
                  {s.count === 0 && <p className="crm-muted crm-small py-2 text-center">None</p>}
                  {s.count > s.cards.length && <p className="crm-muted text-xs">+{s.count - s.cards.length} more (filter to narrow)</p>}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <CrmCard title={`${rows.length} open opportunities`} flush>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Stage</TableHead>
                    {isAdmin && <TableHead>Owner</TableHead>}
                    <TableHead>List price</TableHead>
                    <TableHead>Last activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c) => (
                    <TableRow key={c.interestId}>
                      <TableCell>
                        <Link href={`/dashboard/crm/leads/${c.leadId}`} className="font-semibold hover:underline">
                          {c.name || "Unnamed"}
                        </Link>
                        {c.overdue && <CrmPill tone="bad" className="ml-2">Overdue</CrmPill>}
                      </TableCell>
                      <TableCell>{c.courseTitle}</TableCell>
                      <TableCell>
                        <Select value={c.stage} onValueChange={(v) => move(c, c.stage, v as InterestStage)}>
                          <SelectTrigger className="h-8 w-[170px] text-xs" aria-label={`Stage of ${c.name || "lead"} (${c.courseTitle})`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {moveTargets(c.stage).map((st) => (
                              <SelectItem key={st} value={st}>
                                {INTEREST_STAGE_LABELS[st]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {isAdmin && <TableCell>{c.ownerName || "Unassigned"}</TableCell>}
                      <TableCell>{rs(c.listPrice)}</TableCell>
                      <TableCell>{timeAgo(c.lastSignalAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CrmCard>
        )}
      </DataState>
    </div>
  );
}

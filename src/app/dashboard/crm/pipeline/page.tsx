"use client";

// Sales & CRM → Sales Pipeline: open course opportunities by stage. Drag a
// card to another column, or use its "Move to" menu (keyboard friendly).
// The backend validates every move (no manual win; "quoted" waits for quotes;
// "payment pending" needs a pending course assignment) and answers with the
// reason when it refuses. Totals are course list prices, never revenue.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Columns3, KanbanSquare, Rows3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/context/admin-context";
import { DataState, DoNotContactBadge } from "@/components/crm/crm-ui";
import { INTEREST_STAGE_LABELS, InterestStage, Pipeline, PipelineCard, Rep, crmApi, fetchCourseCatalog, rs, timeAgo } from "@/lib/crm/api";

const ANY = "any";

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <KanbanSquare className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold text-gray-900">Sales Pipeline</h1>
          </div>
          <p className="mt-2 text-gray-600">Open course opportunities by stage. Values are list prices, not revenue. An opportunity is won only when a payment is verified.</p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Layout">
          <Button type="button" variant={view === "board" ? "default" : "outline"} size="sm" onClick={() => setView("board")} aria-pressed={view === "board"}>
            <Columns3 className="mr-1 h-4 w-4" /> Board
          </Button>
          <Button type="button" variant={view === "table" ? "default" : "outline"} size="sm" onClick={() => setView("table")} aria-pressed={view === "table"}>
            <Rows3 className="mr-1 h-4 w-4" /> Table
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {isAdmin && reps.length > 0 && (
          <Select value={ownerId} onValueChange={setOwnerId}>
            <SelectTrigger className="w-full sm:w-[200px]" aria-label="Owner">
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
          <SelectTrigger className="w-full sm:w-[240px]" aria-label="Course">
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
          <div className="grid gap-4 overflow-x-auto pb-2 md:grid-cols-5">
            {data?.stages.map((s) => (
              <section
                key={s.stage}
                aria-label={INTEREST_STAGE_LABELS[s.stage]}
                className={`min-w-[220px] rounded-lg border bg-gray-50 p-3 ${dragOver === s.stage ? "ring-2 ring-primary" : ""}`}
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
                <div className="mb-3">
                  <h2 className="text-sm font-semibold">{INTEREST_STAGE_LABELS[s.stage]}</h2>
                  <p className="text-xs text-muted-foreground">
                    {s.count} · {rs(s.listPriceTotal)}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {s.cards.map((c) => (
                    <Card
                      key={c.interestId}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("application/json", JSON.stringify({ card: c, from: s.stage }))}
                      className={`cursor-grab bg-white ${moving === c.interestId ? "opacity-50" : ""}`}
                    >
                      <CardContent className="space-y-1 p-3 text-sm">
                        <Link href={`/dashboard/crm/leads/${c.leadId}`} className="font-medium hover:underline">
                          {c.name || "Unnamed"}
                        </Link>
                        <div className="text-xs text-muted-foreground">{c.courseTitle}</div>
                        <div className="text-xs text-muted-foreground">
                          {rs(c.listPrice)} · activity {timeAgo(c.lastSignalAt)}
                        </div>
                        {isAdmin && <div className="text-xs">{c.ownerName || "Unassigned"}</div>}
                        <div className="flex flex-wrap gap-1">
                          {c.overdue && (
                            <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                              <AlertTriangle className="mr-1 h-3 w-3" /> Overdue
                            </Badge>
                          )}
                          {c.doNotContact && <DoNotContactBadge />}
                        </div>
                        <Select value={s.stage} onValueChange={(v) => move(c, s.stage, v as InterestStage)}>
                          <SelectTrigger className="mt-1 h-8 text-xs" aria-label={`Move ${c.name || "lead"} (${c.courseTitle}) to`}>
                            <SelectValue placeholder="Move to" />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(INTEREST_STAGE_LABELS) as InterestStage[]).map((st) => (
                              <SelectItem key={st} value={st}>
                                {INTEREST_STAGE_LABELS[st]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  ))}
                  {s.count > s.cards.length && <p className="text-xs text-muted-foreground">+{s.count - s.cards.length} more (filter to narrow)</p>}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{rows.length} open opportunities</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
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
                        <Link href={`/dashboard/crm/leads/${c.leadId}`} className="font-medium hover:underline">
                          {c.name || "Unnamed"}
                        </Link>
                        {c.overdue && <span className="ml-2 text-xs text-red-700">overdue</span>}
                      </TableCell>
                      <TableCell>{c.courseTitle}</TableCell>
                      <TableCell>
                        <Select value={c.stage} onValueChange={(v) => move(c, c.stage, v as InterestStage)}>
                          <SelectTrigger className="h-8 w-[170px] text-xs" aria-label={`Stage of ${c.name || "lead"} (${c.courseTitle})`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(INTEREST_STAGE_LABELS) as InterestStage[]).map((st) => (
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
            </CardContent>
          </Card>
        )}
      </DataState>
    </div>
  );
}

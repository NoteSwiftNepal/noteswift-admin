"use client";

// Team & allocation tab (Super Admin and Admin, crm.manage_reps).
// Lists Sales accounts only. Invitations made here always create Sales
// accounts; other admin accounts are managed only in Admin Management.
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Mail, Settings2, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { DataState } from "@/components/crm/crm-ui";
import { CrmCard, CrmKpi, CrmKpis, CrmPageHeader, CrmPill, CrmTabs, Tone } from "@/components/crm/ui";
import { MyTargetView, TargetsTab } from "@/components/crm/targets";
import { useAdmin } from "@/context/admin-context";
import { Rep, crmApi, fetchCourseCatalog, fmtDateTime } from "@/lib/crm/api";

// Sales & CRM → Team & Targets (Phase S5). Admin and Super Admin: tabs
// Targets and Team & allocation (the earlier Sales Team page, unchanged and
// behind crm.manage_reps). Sales: their "My target" view only. The backend
// enforces every permission; this only picks what to show.
export default function TeamAndTargetsPage() {
  return (
    <Suspense fallback={null}>
      <TeamAndTargetsInner />
    </Suspense>
  );
}

function TeamAndTargetsInner() {
  const { can } = useAdmin();
  const router = useRouter();
  const params = useSearchParams();
  const team = can("crm.view_team_reports");
  const tab = params.get("tab") === "team" && can("crm.manage_reps") ? "team" : "targets";
  if (!team) {
    return (
      <div className="flex flex-col gap-4">
        <CrmPageHeader crumb="Team & Targets" title="My target" subtitle="Your monthly target, progress and bonus." />
        <MyTargetView />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <CrmPageHeader crumb="Team & Targets" title="Team & Targets" subtitle="Targets, bonuses and the sales team." />
      <CrmCard flush>
        <CrmTabs
          label="Team & Targets"
          value={tab}
          onChange={(v) => router.replace(`/dashboard/crm/team${v === "team" ? "?tab=team" : ""}`)}
          tabs={[{ value: "targets", label: "Targets" }, ...(can("crm.manage_reps") ? [{ value: "team" as const, label: "Team & allocation" }] : [])]}
        />
      </CrmCard>
      {tab === "targets" ? <TargetsTab /> : <TeamAllocation />}
    </div>
  );
}

const STATUS_BADGE: Record<Rep["status"], { label: string; tone: Tone }> = {
  active: { label: "Active", tone: "good" },
  invited: { label: "Invited", tone: "accent" },
  invite_expired: { label: "Invite expired", tone: "warn" },
  inactive: { label: "Deactivated", tone: "neutral" },
};

function TeamAllocation() {
  const { toast } = useToast();
  const [reps, setReps] = useState<Rep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editRep, setEditRep] = useState<Rep | null>(null);
  const [deactivateRep, setDeactivateRep] = useState<Rep | null>(null);
  const [courses, setCourses] = useState<{ _id: string; title: string }[]>([]);
  const [unassigned, setUnassigned] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setReps(await crmApi.reps());
      const q = await crmApi.listLeads({ view: "unassigned", limit: 1 });
      setUnassigned(q.pagination.total);
    } catch (e: any) {
      setError(e?.message || "Could not load the team");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    fetchCourseCatalog().then(setCourses);
  }, [load]);

  const active = reps.filter((r) => r.status === "active");

  return (
    <div className="flex flex-col gap-4">
      <div className="crm-page-head">
        <p className="!m-0">Sales accounts, their availability and what leads they take.</p>
        <Button type="button" onClick={() => setInviteOpen(true)}>
          <Mail className="mr-1 h-4 w-4" /> Invite salesperson
        </Button>
      </div>

      <CrmKpis>
        <CrmKpi label="Active salespeople" value={loading ? "—" : active.length} caption="Sales accounts that can sign in" />
        <CrmKpi label="Available for new leads" value={loading ? "—" : active.filter((r) => r.profile.isAvailable).length} caption="Taking automatic assignment" />
        <CrmKpi
          label="Unassigned leads"
          value={unassigned === null ? "—" : unassigned}
          caption={unassigned ? "Waiting for an owner" : "Every lead has an owner"}
          tone={unassigned ? "warn" : undefined}
          href={unassigned === null ? undefined : "/dashboard/crm/leads?view=unassigned"}
        />
      </CrmKpis>

      <CrmCard title="Salespeople" aside={<span className="crm-muted crm-small">{reps.length} account{reps.length === 1 ? "" : "s"}</span>} flush>
          <DataState loading={loading} error={error} onRetry={load} empty={reps.length === 0} emptyText="No Sales accounts yet. Invite your first salesperson.">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Salesperson</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Open leads</TableHead>
                    <TableHead>Takes</TableHead>
                    <TableHead>Last login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reps.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell>
                        <div className="font-semibold">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                      </TableCell>
                      <TableCell>
                        <CrmPill tone={STATUS_BADGE[r.status].tone}>{STATUS_BADGE[r.status].label}</CrmPill>
                        {r.status === "active" && !r.profile.isAvailable && <div className="mt-1 text-xs text-muted-foreground">Not taking new leads</div>}
                      </TableCell>
                      <TableCell>
                        {r.profile.activeLeadCount}
                        {r.profile.capacity != null ? ` / ${r.profile.capacity}` : ""}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {[
                          r.profile.grades.length ? `Grades ${r.profile.grades.join(", ")}` : null,
                          r.profile.districts.length ? r.profile.districts.join(", ") : null,
                          r.profile.courseIds.length ? `${r.profile.courseIds.length} course(s)` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Any lead"}
                      </TableCell>
                      <TableCell className="text-sm">{r.lastLogin ? fmtDateTime(r.lastLogin) : "Never"}</TableCell>
                      <TableCell className="text-right">
                        {r.status === "active" && (
                          <div className="flex justify-end gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={() => setEditRep(r)}>
                              <Settings2 className="mr-1 h-4 w-4" /> Allocation
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setDeactivateRep(r)}>
                              <UserMinus className="mr-1 h-4 w-4" /> Deactivate
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
      </CrmCard>

      {/* The discount approvals card went with quotes (R62) and the code allocation card is hidden (R59). */}

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} onDone={(msg) => { toast({ title: msg }); load(); }} />
      <ProfileDialog rep={editRep} courses={courses} onClose={() => setEditRep(null)} onDone={() => { toast({ title: "Allocation updated" }); load(); }} />
      <DeactivateDialog rep={deactivateRep} others={active.filter((r) => r._id !== deactivateRep?._id)} onClose={() => setDeactivateRep(null)} onDone={(n) => { toast({ title: `Deactivated; ${n} lead(s) moved` }); load(); }} />
    </div>
  );
}

function InviteDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; onDone: (msg: string) => void }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setEmail("");
      setMessage("");
      setError(null);
      setLink(null);
    }
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite salesperson</DialogTitle>
          <DialogDescription>Creates a Sales account. Use an email that doesn&apos;t already belong to an admin account.</DialogDescription>
        </DialogHeader>
        {link ? (
          <div className="space-y-2 text-sm">
            <p>The email could not be sent. Share this signup link with them directly:</p>
            <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Signup link" />
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label htmlFor="invite-email">Email</Label>
              <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} />
            </div>
            <div>
              <Label htmlFor="invite-message">Message (optional)</Label>
              <Textarea id="invite-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={1000} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}
        <DialogFooter>
          {link ? (
            <Button type="button" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={busy || !email.trim()}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    const r = await crmApi.inviteRep(email.trim(), message.trim() || undefined);
                    if (r.emailSent) {
                      onDone("Invitation sent");
                      onOpenChange(false);
                    } else {
                      setLink(r.invitationUrl);
                      onDone("Invitation created; email not sent");
                    }
                  } catch (e: any) {
                    setError(e?.message || "Could not invite");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send invitation
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProfileDialog({ rep, courses, onClose, onDone }: { rep: Rep | null; courses: { _id: string; title: string }[]; onClose: () => void; onDone: () => void }) {
  const [isAvailable, setIsAvailable] = useState(true);
  const [capacity, setCapacity] = useState("");
  const [grades, setGrades] = useState("");
  const [districts, setDistricts] = useState("");
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (rep) {
      setIsAvailable(rep.profile.isAvailable);
      setCapacity(rep.profile.capacity == null ? "" : String(rep.profile.capacity));
      setGrades(rep.profile.grades.join(", "));
      setDistricts(rep.profile.districts.join(", "));
      setCourseIds(rep.profile.courseIds);
      setError(null);
    }
  }, [rep]);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const gradeList = grades.split(",").map((g) => g.trim()).filter(Boolean).map(Number);
      await crmApi.updateRepProfile(rep!._id, {
        isAvailable,
        capacity: capacity.trim() === "" ? null : Number(capacity),
        grades: gradeList,
        districts: districts.split(",").map((d) => d.trim()).filter(Boolean),
        courseIds,
      });
      onDone();
      onClose();
    } catch (e: any) {
      setError(e?.message || "Could not save");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={!!rep} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Allocation for {rep?.name}</DialogTitle>
          <DialogDescription>Used by automatic (round-robin) assignment. Empty lists mean &quot;any&quot;.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Switch id="rep-available" checked={isAvailable} onCheckedChange={setIsAvailable} />
            <Label htmlFor="rep-available">Taking new leads</Label>
          </div>
          <div>
            <Label htmlFor="rep-capacity">Most open leads at once (empty = no limit)</Label>
            <Input id="rep-capacity" type="number" min={0} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="rep-grades">Grades (comma separated, e.g. 11, 12)</Label>
            <Input id="rep-grades" value={grades} onChange={(e) => setGrades(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="rep-districts">Districts (comma separated)</Label>
            <Input id="rep-districts" value={districts} onChange={(e) => setDistricts(e.target.value)} />
          </div>
          <div>
            <Label>Courses</Label>
            <div className="mt-1 max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
              {courses.map((c) => (
                <label key={c._id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={courseIds.includes(c._id)}
                    onChange={(e) => setCourseIds((prev) => (e.target.checked ? [...prev, c._id] : prev.filter((x) => x !== c._id)))}
                  />
                  {c.title}
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeactivateDialog({ rep, others, onClose, onDone }: { rep: Rep | null; others: Rep[]; onClose: () => void; onDone: (moved: number) => void }) {
  const [reason, setReason] = useState("");
  const [target, setTarget] = useState("none");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (rep) {
      setReason("");
      setTarget("none");
      setError(null);
    }
  }, [rep]);
  return (
    <Dialog open={!!rep} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deactivate {rep?.name}</DialogTitle>
          <DialogDescription>They are signed out at once and lose access. The account and its history are kept.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="deact-target">Move their {rep?.profile.activeLeadCount ?? 0} lead(s) to</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger id="deact-target">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">The unassigned queue</SelectItem>
                {others.map((r) => (
                  <SelectItem key={r._id} value={r._id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="deact-reason">Reason</Label>
            <Textarea id="deact-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy || !reason.trim()}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                const r = await crmApi.deactivateRep(rep!._id, reason.trim(), target === "none" ? null : target);
                onDone(r.leadsMoved);
                onClose();
              } catch (e: any) {
                setError(e?.message || "Could not deactivate");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Deactivate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

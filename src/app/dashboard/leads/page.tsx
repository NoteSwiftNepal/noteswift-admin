"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, MessageCircle, NotebookPen, Phone, Search, UserSearch } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS, createFetchOptions } from "@/config/api";

// Leads: logged-in students who opened a paid course's page or its checkout
// but haven't bought it. Admins call or message them (e.g. with a discount
// code) and record the follow-up here.

type LeadStatus = "new" | "contacted" | "not_interested";

type Lead = {
  _id: string;
  student: { _id: string; name?: string; phone?: string; email?: string; grade?: string };
  course: { _id: string; title: string; price: number; discountPercent: number } | null;
  stage: "viewed" | "checkout";
  viewCount: number;
  checkoutCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  lastSource?: "web" | "mobile";
  status: LeadStatus;
  notes?: string;
  contactedAt?: string;
  contactedByName?: string;
  enrolled: boolean;
  enrolledAt?: string;
};

type Summary = { total: number; checkout: number; viewed: number; new: number; contacted: number; notInterested: number };

const STATUS_LABELS: Record<LeadStatus, string> = { new: "New", contacted: "Contacted", not_interested: "Not interested" };
const ALL = "all";

const rs = (n: number) => `Rs. ${Number(n || 0).toLocaleString("en-IN")}`;

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// Nepali mobile numbers (98XXXXXXXX / 97XXXXXXXX) → WhatsApp link with +977.
function whatsappLink(phone?: string) {
  const digits = (phone || "").replace(/\D/g, "");
  if (/^9[78]\d{8}$/.test(digits)) return `https://wa.me/977${digits}`;
  if (/^9779[78]\d{8}$/.test(digits)) return `https://wa.me/${digits}`;
  return null;
}

export default function LeadsPage() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [courseOptions, setCourseOptions] = useState<{ _id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [courseId, setCourseId] = useState(ALL);
  const [stage, setStage] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [enrolled, setEnrolled] = useState("no");

  const [notesFor, setNotesFor] = useState<Lead | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [saving, setSaving] = useState(false);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25", enrolled });
      if (q) params.set("q", q);
      if (courseId !== ALL) params.set("courseId", courseId);
      if (stage !== ALL) params.set("stage", stage);
      if (status !== ALL) params.set("status", status);
      const res = await fetch(`${API_ENDPOINTS.LEADS.LIST}?${params}`, createFetchOptions("GET"));
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to load");
      setLeads(json.data);
      setSummary(json.summary);
      setPages(json.pagination?.pages || 1);
      setCourseOptions(json.courseOptions || []);
    } catch (err: any) {
      toast({ title: "Couldn't load leads", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, q, courseId, stage, status, enrolled, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const update = async (lead: Lead, body: { status?: LeadStatus; notes?: string }) => {
    setSaving(true);
    try {
      const res = await fetch(API_ENDPOINTS.LEADS.UPDATE(lead._id), createFetchOptions("PUT", body));
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to save");
      setLeads((prev) =>
        prev.map((l) =>
          l._id === lead._id
            ? { ...l, status: json.data.status, notes: json.data.notes, contactedAt: json.data.contactedAt, contactedByName: json.data.contactedByName }
            : l
        )
      );
      return true;
    } catch (err: any) {
      toast({ title: "Couldn't save", description: err.message, variant: "destructive" });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    if (!notesFor) return;
    if (await update(notesFor, { notes: notesDraft })) {
      setNotesFor(null);
      toast({ title: "Notes saved" });
    }
  };

  const filterSelect = (value: string, onChange: (v: string) => void, placeholder: string, options: [string, string][], width = "w-[170px]") => (
    <Select
      value={value}
      onValueChange={(v) => {
        onChange(v);
        setPage(1);
      }}
    >
      <SelectTrigger className={width}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, label]) => (
          <SelectItem key={v} value={v}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserSearch className="h-6 w-6" /> Leads
        </h1>
        <p className="text-muted-foreground">
          Students who opened a paid course&apos;s page or checkout but haven&apos;t bought it. Contact them, then record what happened.
        </p>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Leads (current filters)</CardDescription>
              <CardTitle className="text-3xl">{summary.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Reached checkout</CardDescription>
              <CardTitle className="text-3xl">{summary.checkout}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Not contacted yet</CardDescription>
              <CardTitle className="text-3xl">{summary.new}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search name, phone or email" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
            </div>
            {filterSelect(courseId, setCourseId, "Course", [[ALL, "All courses"], ...courseOptions.map((c) => [c._id, c.title] as [string, string])], "w-[220px]")}
            {filterSelect(stage, setStage, "Stage", [[ALL, "Any stage"], ["checkout", "Reached checkout"], ["viewed", "Viewed course only"]])}
            {filterSelect(status, setStatus, "Status", [[ALL, "Any status"], ["new", "New"], ["contacted", "Contacted"], ["not_interested", "Not interested"]])}
            {filterSelect(enrolled, setEnrolled, "Enrolled", [["no", "Not enrolled yet"], ["yes", "Enrolled since"], ["all", "Everyone"]])}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Last seen</TableHead>
                  <TableHead>Follow-up</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No leads match these filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  leads.map((l) => {
                    const wa = whatsappLink(l.student.phone);
                    return (
                      <TableRow key={l._id}>
                        <TableCell>
                          <div className="font-medium">{l.student.name || "—"}</div>
                          {l.student.grade && <div className="text-xs text-muted-foreground">{l.student.grade}</div>}
                          {l.enrolled && (
                            <Badge variant="secondary" className="mt-1 bg-green-100 text-green-800">
                              Enrolled
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm space-y-1">
                          {l.student.phone ? (
                            <div className="flex items-center gap-2">
                              <a href={`tel:${l.student.phone}`} className="flex items-center gap-1 hover:underline">
                                <Phone className="h-3.5 w-3.5" /> {l.student.phone}
                              </a>
                              {wa && (
                                <a href={wa} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="text-green-600 hover:text-green-700">
                                  <MessageCircle className="h-4 w-4" />
                                </a>
                              )}
                            </div>
                          ) : (
                            <div className="text-muted-foreground">No phone</div>
                          )}
                          {l.student.email && (
                            <a href={`mailto:${l.student.email}`} className="flex items-center gap-1 text-muted-foreground hover:underline break-all">
                              <Mail className="h-3.5 w-3.5 shrink-0" /> {l.student.email}
                            </a>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{l.course?.title || "Deleted course"}</div>
                          {l.course && (
                            <div className="text-xs text-muted-foreground">
                              {rs(l.course.price)}
                              {l.course.discountPercent > 0 && ` · ${l.course.discountPercent}% off`}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {l.stage === "checkout" ? (
                            <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">Reached checkout</Badge>
                          ) : (
                            <Badge variant="outline">Viewed course</Badge>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {l.viewCount} page visit{l.viewCount === 1 ? "" : "s"}
                            {l.checkoutCount > 0 && ` · ${l.checkoutCount} checkout${l.checkoutCount === 1 ? "" : "s"}`}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          <div title={new Date(l.lastSeenAt).toLocaleString()}>{timeAgo(l.lastSeenAt)}</div>
                          {l.lastSource && <div className="text-xs text-muted-foreground">{l.lastSource === "mobile" ? "Mobile app" : "Website"}</div>}
                        </TableCell>
                        <TableCell className="min-w-[190px]">
                          <Select value={l.status} onValueChange={(v) => void update(l, { status: v as LeadStatus })} disabled={saving}>
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
                                <SelectItem key={s} value={s}>
                                  {STATUS_LABELS[s]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {l.contactedAt && (
                            <div className="text-xs text-muted-foreground mt-1">
                              by {l.contactedByName || "admin"}, {timeAgo(l.contactedAt)}
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 mt-1 text-xs"
                            onClick={() => {
                              setNotesFor(l);
                              setNotesDraft(l.notes || "");
                            }}
                          >
                            <NotebookPen className="h-3.5 w-3.5 mr-1" />
                            {l.notes ? "Edit notes" : "Add notes"}
                          </Button>
                          {l.notes && <div className="text-xs text-muted-foreground line-clamp-2 max-w-[220px]">{l.notes}</div>}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-end gap-2 mt-4">
              <Button type="button" variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {pages}
              </span>
              <Button type="button" variant="outline" size="sm" disabled={page >= pages || loading} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!notesFor} onOpenChange={(open) => !open && setNotesFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notes</DialogTitle>
            <DialogDescription>
              {notesFor?.student.name} · {notesFor?.course?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="lead-notes">What happened?</Label>
            <Textarea
              id="lead-notes"
              rows={5}
              maxLength={1000}
              placeholder="e.g. Called on 10 Oct, sent code SCIENCE10, will decide this week"
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNotesFor(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveNotes()} disabled={saving}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

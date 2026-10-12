"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, MessageCircle, Phone, Search, UserSearch } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS, createFetchOptions } from "@/config/api";

// Leads: logged-in students who opened a paid course's page or its checkout
// but haven't bought it. One row per student; click it to see each course
// they looked at (a summary per course, most recent first) and to record the
// follow-up, which is one per student.

type LeadStatus = "new" | "contacted" | "not_interested";

type FollowUp = {
  status: LeadStatus;
  notes?: string | null;
  contactedAt?: string | null;
  contactedByName?: string | null;
};

type StudentInfo = { name?: string; phone?: string; email?: string; grade?: string };

type LeadRow = {
  studentId: string;
  student: StudentInfo;
  courseCount: number;
  courses: { courseId: string; title: string; stage: "viewed" | "checkout" }[];
  stage: "viewed" | "checkout";
  viewCount: number;
  checkoutCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  followUp: FollowUp;
};

type CourseSummary = {
  courseId: string;
  title: string;
  price: number | null;
  discountPercent: number;
  stage: "viewed" | "checkout";
  viewCount: number;
  checkoutCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  lastSource?: "web" | "mobile";
  enrolled: boolean;
  enrolledAt?: string | null;
};

type LeadDetail = { studentId: string; student: StudentInfo; followUp: FollowUp; courses: CourseSummary[] };

type Summary = { total: number; checkout: number; new: number; contacted: number; notInterested: number };

const STATUS_LABELS: Record<LeadStatus, string> = { new: "New", contacted: "Contacted", not_interested: "Not interested" };
const STATUS_BADGE: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  contacted: "bg-green-100 text-green-800 hover:bg-green-100",
  not_interested: "bg-gray-200 text-gray-700 hover:bg-gray-200",
};
const ALL = "all";

const rs = (n: number) => `Rs. ${Number(n || 0).toLocaleString("en-IN")}`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const fullDate = (iso: string) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

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

function ContactLinks({ student }: { student: StudentInfo }) {
  const wa = whatsappLink(student.phone);
  return (
    <div className="text-sm space-y-1" onClick={(e) => e.stopPropagation()}>
      {student.phone ? (
        <div className="flex items-center gap-2">
          <a href={`tel:${student.phone}`} className="flex items-center gap-1 hover:underline">
            <Phone className="h-3.5 w-3.5" /> {student.phone}
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
      {student.email && (
        <a href={`mailto:${student.email}`} className="flex items-center gap-1 text-muted-foreground hover:underline break-all">
          <Mail className="h-3.5 w-3.5 shrink-0" /> {student.email}
        </a>
      )}
    </div>
  );
}

const StageBadge = ({ stage }: { stage: "viewed" | "checkout" }) =>
  stage === "checkout" ? (
    <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">Reached checkout</Badge>
  ) : (
    <Badge variant="outline">Viewed course</Badge>
  );

export default function LeadsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<LeadRow[]>([]);
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

  // Student details panel
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [draftStatus, setDraftStatus] = useState<LeadStatus>("new");
  const [draftNotes, setDraftNotes] = useState("");
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
      setRows(json.data);
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

  const openStudent = async (studentId: string) => {
    setOpenId(studentId);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.LEADS.STUDENT(studentId), createFetchOptions("GET"));
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to load");
      setDetail(json.data);
      setDraftStatus(json.data.followUp.status);
      setDraftNotes(json.data.followUp.notes || "");
    } catch (err: any) {
      toast({ title: "Couldn't load this student", description: err.message, variant: "destructive" });
      setOpenId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const saveFollowUp = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      const res = await fetch(API_ENDPOINTS.LEADS.FOLLOW_UP(detail.studentId), createFetchOptions("PUT", { status: draftStatus, notes: draftNotes }));
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to save");
      setDetail({ ...detail, followUp: json.data });
      setRows((prev) => prev.map((r) => (r.studentId === detail.studentId ? { ...r, followUp: json.data } : r)));
      toast({ title: "Follow-up saved" });
    } catch (err: any) {
      toast({ title: "Couldn't save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
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

  const followUpChanged = !!detail && (draftStatus !== detail.followUp.status || draftNotes !== (detail.followUp.notes || ""));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserSearch className="h-6 w-6" /> Leads
        </h1>
        <p className="text-muted-foreground">
          Students who opened a paid course&apos;s page or checkout but haven&apos;t bought it. Click a student to see each course they looked at and to record your follow-up.
        </p>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Students (current filters)</CardDescription>
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
            {filterSelect(stage, setStage, "Stage", [[ALL, "Any stage"], ["checkout", "Reached checkout"], ["viewed", "Viewed only"]])}
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
                  <TableHead>Courses</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Last seen</TableHead>
                  <TableHead>Follow-up</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No leads match these filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow
                      key={r.studentId}
                      onClick={() => void openStudent(r.studentId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          void openStudent(r.studentId);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open ${r.student.name || "student"}`}
                      className="cursor-pointer hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <TableCell>
                        <div className="font-medium">{r.student.name || "—"}</div>
                        {r.student.grade && <div className="text-xs text-muted-foreground">{r.student.grade}</div>}
                      </TableCell>
                      <TableCell>
                        <ContactLinks student={r.student} />
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        <div className="flex flex-wrap gap-1">
                          {r.courses.slice(0, 2).map((c) => (
                            <Badge key={c.courseId} variant="secondary" className="font-normal max-w-[200px] truncate">
                              {c.title}
                            </Badge>
                          ))}
                          {r.courseCount > 2 && <Badge variant="outline">+{r.courseCount - 2} more</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StageBadge stage={r.stage} />
                        <div className="text-xs text-muted-foreground mt-1">
                          {plural(r.viewCount, "page visit")}
                          {r.checkoutCount > 0 && ` · ${plural(r.checkoutCount, "checkout")}`}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        <span title={fullDate(r.lastSeenAt)}>{timeAgo(r.lastSeenAt)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_BADGE[r.followUp.status]}>{STATUS_LABELS[r.followUp.status]}</Badge>
                        {r.followUp.notes && <div className="text-xs text-muted-foreground line-clamp-1 max-w-[200px] mt-1">{r.followUp.notes}</div>}
                      </TableCell>
                    </TableRow>
                  ))
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

      <Sheet open={!!openId} onOpenChange={(open) => !open && !saving && setOpenId(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {detailLoading || !detail ? (
            <div className="space-y-4 mt-6">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle>{detail.student.name || "Student"}</SheetTitle>
                <SheetDescription>
                  {detail.student.grade ? `${detail.student.grade} · ` : ""}
                  {plural(detail.courses.length, "course")} looked at
                </SheetDescription>
              </SheetHeader>

              <ContactLinks student={detail.student} />

              {/* One follow-up for the student */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Follow-up</h3>
                  {detail.followUp.contactedAt && (
                    <span className="text-xs text-muted-foreground">
                      Contacted by {detail.followUp.contactedByName || "admin"}, {timeAgo(detail.followUp.contactedAt)}
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={draftStatus} onValueChange={(v) => setDraftStatus(v as LeadStatus)}>
                    <SelectTrigger>
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
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-notes">Notes</Label>
                  <Textarea
                    id="lead-notes"
                    rows={4}
                    maxLength={2000}
                    placeholder="e.g. Called on 10 Oct, sent code SCIENCE10, will decide this week"
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="button" onClick={() => void saveFollowUp()} disabled={saving || !followUpChanged}>
                    {saving ? "Saving…" : "Save follow-up"}
                  </Button>
                </div>
              </div>

              {/* Per-course summaries, most recent first */}
              <div className="space-y-3">
                <h3 className="font-semibold">Courses looked at</h3>
                {detail.courses.map((c) => (
                  <div key={c.courseId} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">{c.title}</div>
                        {c.price !== null && (
                          <div className="text-xs text-muted-foreground">
                            {rs(c.price)}
                            {c.discountPercent > 0 && ` · ${c.discountPercent}% off`}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <StageBadge stage={c.stage} />
                        {c.enrolled && <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Enrolled</Badge>}
                      </div>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-3">
                      <dt className="text-muted-foreground">Page visits</dt>
                      <dd>{c.viewCount}</dd>
                      <dt className="text-muted-foreground">Checkouts</dt>
                      <dd>{c.checkoutCount}</dd>
                      <dt className="text-muted-foreground">First seen</dt>
                      <dd>{fullDate(c.firstSeenAt)}</dd>
                      <dt className="text-muted-foreground">Last seen</dt>
                      <dd>
                        {fullDate(c.lastSeenAt)}
                        {c.lastSource && <span className="text-muted-foreground"> · {c.lastSource === "mobile" ? "Mobile app" : "Website"}</span>}
                      </dd>
                      {c.enrolled && c.enrolledAt && (
                        <>
                          <dt className="text-muted-foreground">Enrolled</dt>
                          <dd>{fullDate(c.enrolledAt)}</dd>
                        </>
                      )}
                    </dl>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

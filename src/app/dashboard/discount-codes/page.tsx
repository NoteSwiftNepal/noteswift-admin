"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Pencil, Plus, Trash2, TicketPercent } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS, createFetchOptions } from "@/config/api";

// Percent-off promo codes ("discount codes" in the backend/API). At checkout the course's own discount applies
// first, then the code; a course can never become free. A use is counted
// only when a payment succeeds.

type DiscountCode = {
  _id: string;
  code: string;
  description?: string;
  percent: number;
  appliesToAllCourses: boolean;
  courseIds: string[];
  startsAt?: string;
  endsAt?: string;
  maxUses?: number;
  maxUsesPerStudent: number;
  usedCount: number;
  isActive: boolean;
  createdByName?: string;
  createdAt: string;
  payments: number;
  revenue: number;
  discountGiven: number;
};

type CourseOption = { _id: string; title: string; price: number; discountPercent: number };

type FormState = {
  code: string;
  description: string;
  percent: string;
  appliesToAllCourses: boolean;
  courseIds: string[];
  startsAt: string;
  endsAt: string;
  maxUses: string;
  maxUsesPerStudent: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  code: "",
  description: "",
  percent: "",
  appliesToAllCourses: true,
  courseIds: [],
  startsAt: "",
  endsAt: "",
  maxUses: "",
  maxUsesPerStudent: "1",
  isActive: true,
};

// Same rounding as the backend pricingService: each discount rounded to
// whole rupees, course discount first, then the code.
function priceAfter(course: CourseOption, codePercent: number) {
  const afterCourse = course.price - Math.round((course.price * (course.discountPercent || 0)) / 100);
  return afterCourse - Math.round((afterCourse * codePercent) / 100);
}

const toDateInput = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");
const rs = (n: number) => `Rs. ${Number(n || 0).toLocaleString("en-IN")}`;

export default function DiscountCodesPage() {
  const { toast } = useToast();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [courseOptions, setCourseOptions] = useState<CourseOption[]>([]);
  const [courseTitles, setCourseTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DiscountCode | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<DiscountCode | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(API_ENDPOINTS.DISCOUNT_CODES.LIST, createFetchOptions("GET"));
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to load");
      setCodes(json.data);
      setCourseOptions(json.courseOptions || []);
      setCourseTitles(json.courseTitles || {});
    } catch (err: any) {
      toast({ title: "Couldn't load promo codes", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (c: DiscountCode) => {
    setEditing(c);
    setForm({
      code: c.code,
      description: c.description || "",
      percent: String(c.percent),
      appliesToAllCourses: c.appliesToAllCourses,
      courseIds: c.courseIds || [],
      startsAt: toDateInput(c.startsAt),
      endsAt: toDateInput(c.endsAt),
      maxUses: c.maxUses ? String(c.maxUses) : "",
      maxUsesPerStudent: String(c.maxUsesPerStudent || 1),
      isActive: c.isActive,
    });
    setDialogOpen(true);
  };

  const percent = Number(form.percent);
  const percentValid = form.percent.trim() !== "" && percent > 0 && percent < 100;
  const previewCourses = useMemo(
    () => (form.appliesToAllCourses ? courseOptions : courseOptions.filter((c) => form.courseIds.includes(c._id))).slice(0, 5),
    [form.appliesToAllCourses, form.courseIds, courseOptions]
  );

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, any> = {
        description: form.description,
        percent,
        appliesToAllCourses: form.appliesToAllCourses,
        courseIds: form.appliesToAllCourses ? [] : form.courseIds,
        // End date is inclusive: valid until the end of that day.
        startsAt: form.startsAt ? new Date(`${form.startsAt}T00:00:00`).toISOString() : null,
        endsAt: form.endsAt ? new Date(`${form.endsAt}T23:59:59`).toISOString() : null,
        maxUses: form.maxUses.trim() ? Number(form.maxUses) : null,
        maxUsesPerStudent: Number(form.maxUsesPerStudent || 1),
        isActive: form.isActive,
      };
      if (!editing) body.code = form.code.trim().toUpperCase();
      const res = await fetch(
        editing ? API_ENDPOINTS.DISCOUNT_CODES.UPDATE(editing._id) : API_ENDPOINTS.DISCOUNT_CODES.CREATE,
        createFetchOptions(editing ? "PUT" : "POST", body)
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to save");
      toast({ title: editing ? "Promo code updated" : "Promo code created", description: json.data.code });
      setDialogOpen(false);
      await load();
    } catch (err: any) {
      toast({ title: "Couldn't save the code", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: DiscountCode, isActive: boolean) => {
    setCodes((prev) => prev.map((x) => (x._id === c._id ? { ...x, isActive } : x)));
    try {
      const res = await fetch(API_ENDPOINTS.DISCOUNT_CODES.UPDATE(c._id), createFetchOptions("PUT", { isActive }));
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to update");
    } catch (err: any) {
      setCodes((prev) => prev.map((x) => (x._id === c._id ? { ...x, isActive: !isActive } : x)));
      toast({ title: "Couldn't change the status", description: err.message, variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(API_ENDPOINTS.DISCOUNT_CODES.DELETE(deleting._id), createFetchOptions("DELETE"));
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to delete");
      toast({ title: "Promo code deleted", description: deleting.code });
      await load();
    } catch (err: any) {
      toast({ title: "Couldn't delete the code", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  const validity = (c: DiscountCode) => {
    const now = Date.now();
    if (c.endsAt && new Date(c.endsAt).getTime() < now) return <Badge variant="destructive">Expired</Badge>;
    if (c.startsAt && new Date(c.startsAt).getTime() > now) return <Badge variant="secondary">Starts {new Date(c.startsAt).toLocaleDateString()}</Badge>;
    if (c.maxUses != null && c.usedCount >= c.maxUses) return <Badge variant="secondary">Used up</Badge>;
    return c.endsAt ? <span className="text-xs text-muted-foreground">Until {new Date(c.endsAt).toLocaleDateString()}</span> : <span className="text-xs text-muted-foreground">No end date</span>;
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <TicketPercent className="h-6 w-6" /> Promo Codes
            </CardTitle>
            <CardDescription>
              Percent-off codes students enter at checkout. Applied after the course&apos;s own discount (if the student applied it); a course can never become free.
              A use is counted only when the payment succeeds.
            </CardDescription>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> New code
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Courses</TableHead>
                <TableHead>Validity</TableHead>
                <TableHead>Uses</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Loading…</TableCell>
                </TableRow>
              ) : codes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No promo codes yet. Create one with &quot;New code&quot;.</TableCell>
                </TableRow>
              ) : (
                codes.map((c) => (
                  <TableRow key={c._id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-semibold">{c.code}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          title="Copy code"
                          onClick={() => {
                            void navigator.clipboard?.writeText(c.code);
                            toast({ title: "Copied", description: c.code });
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      {c.description && <div className="text-xs text-muted-foreground">{c.description}</div>}
                      {c.createdByName && <div className="text-xs text-muted-foreground">by {c.createdByName}</div>}
                    </TableCell>
                    <TableCell className="font-semibold">{c.percent}%</TableCell>
                    <TableCell className="max-w-[220px] text-sm">
                      {c.appliesToAllCourses ? "All courses" : c.courseIds.map((id) => courseTitles[id] || id).join(", ")}
                    </TableCell>
                    <TableCell>{validity(c)}</TableCell>
                    <TableCell className="text-sm">
                      {c.usedCount} / {c.maxUses ?? "∞"}
                      <div className="text-xs text-muted-foreground">{c.maxUsesPerStudent} per student</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {rs(c.revenue)}
                      {c.discountGiven > 0 && <div className="text-xs text-muted-foreground">{rs(c.discountGiven)} given off</div>}
                    </TableCell>
                    <TableCell>
                      <Switch checked={c.isActive} onCheckedChange={(v) => void toggleActive(c, v)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button type="button" variant="ghost" size="icon" title="Edit" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title={c.usedCount > 0 ? "Used codes can only be deactivated" : "Delete"}
                        disabled={c.usedCount > 0}
                        onClick={() => setDeleting(c)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.code}` : "New promo code"}</DialogTitle>
            <DialogDescription>Percent off, applied after the course&apos;s own discount.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dc-code">Code</Label>
                <Input
                  id="dc-code"
                  value={form.code}
                  disabled={!!editing}
                  placeholder="e.g. SCHOLAR1500"
                  className="font-mono uppercase"
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, "") })}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {editing ? "A code's text can't be changed." : "3–30 letters, numbers, - or _."}
                </p>
              </div>
              <div>
                <Label htmlFor="dc-percent">Discount (%)</Label>
                <Input
                  id="dc-percent"
                  type="number"
                  min="0.01"
                  max="99.99"
                  step="0.01"
                  value={form.percent}
                  onChange={(e) => setForm({ ...form, percent: e.target.value })}
                />
                {!percentValid && form.percent !== "" && <p className="mt-1 text-xs text-red-600">Must be above 0 and below 100.</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="dc-desc">Description (shown to admins)</Label>
              <Input
                id="dc-desc"
                value={form.description}
                placeholder="e.g. Scholarship for top scorers"
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Courses</Label>
                <div className="flex items-center gap-2 text-sm">
                  <span>All courses</span>
                  <Switch checked={form.appliesToAllCourses} onCheckedChange={(v) => setForm({ ...form, appliesToAllCourses: v })} />
                </div>
              </div>
              {!form.appliesToAllCourses && (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
                  {courseOptions.length === 0 ? (
                    <p className="p-2 text-sm text-muted-foreground">No paid courses found.</p>
                  ) : (
                    courseOptions.map((c) => (
                      <label key={c._id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted">
                        <Checkbox
                          checked={form.courseIds.includes(c._id)}
                          onCheckedChange={(v) =>
                            setForm({
                              ...form,
                              courseIds: v ? [...form.courseIds, c._id] : form.courseIds.filter((id) => id !== c._id),
                            })
                          }
                        />
                        <span className="flex-1">{c.title}</span>
                        <span className="text-xs text-muted-foreground">{rs(c.price)}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dc-start">Starts (optional)</Label>
                <Input id="dc-start" type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="dc-end">Ends (optional, inclusive)</Label>
                <Input id="dc-end" type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="dc-max">Total uses (empty = unlimited)</Label>
                <Input id="dc-max" type="number" min="1" step="1" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="dc-per">Uses per student</Label>
                <Input id="dc-per" type="number" min="1" step="1" value={form.maxUsesPerStudent} onChange={(e) => setForm({ ...form, maxUsesPerStudent: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              <span>Active</span>
            </div>

            {percentValid && previewCourses.length > 0 && (
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <p className="mb-1 font-medium">What students pay with this code</p>
                {previewCourses.map((c) => {
                  const after = priceAfter(c, percent);
                  return (
                    <div key={c._id} className="flex justify-between gap-2">
                      <span className="truncate text-muted-foreground">{c.title}</span>
                      <span className={after <= 0 ? "text-red-600" : ""}>
                        {after <= 0 ? "not allowed (would be free)" : `${rs(c.price)} → ${rs(after)}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={save}
              disabled={
                saving ||
                !percentValid ||
                (!editing && form.code.trim().length < 3) ||
                (!form.appliesToAllCourses && form.courseIds.length === 0)
              }
            >
              {saving ? "Saving…" : editing ? "Save changes" : "Create code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleting?.code}?</DialogTitle>
            <DialogDescription>This code has never been used. Deleting it can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => void confirmDelete()}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

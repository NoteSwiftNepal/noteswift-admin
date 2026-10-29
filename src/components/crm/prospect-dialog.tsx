"use client";

// "Add prospect" (Phase 2/3): someone who hasn't registered yet. Shared by
// Leads & Students and the CRM Dashboard. The backend decides ownership and
// refuses duplicates.
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Rep, crmApi } from "@/lib/crm/api";

export function ProspectDialog({ open, onOpenChange, reps, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; reps: Rep[]; onCreated: (id: string) => void }) {
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
        {error && <p className="text-sm text-destructive">{error}</p>}
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


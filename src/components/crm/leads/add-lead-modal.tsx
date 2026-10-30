"use client";

// "Add lead" (S1b, as the prototype's AddLead modal): someone who hasn't
// registered yet. Shared by Leads and the CRM Dashboard. The backend decides
// ownership (Sales own what they create; Admin choose or leave it unassigned,
// R7), checks duplicates and opens the course opportunity in the same request.
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { Field, Sel } from "@/components/crm/leads/controls";
import { MANUAL_SOURCE_LABELS, ManualSource, Rep, crmApi } from "@/lib/crm/api";

const NEPALI_MOBILE = /^9[678]\d{8}$/;
const PHONE_ERROR = "Enter a 10-digit Nepali mobile number starting with 96, 97 or 98.";

export function AddLeadModal({ open, onClose, reps, courses, onCreated }: { open: boolean; onClose: () => void; reps: Rep[]; courses: { _id: string; title: string }[]; onCreated: (id: string) => void }) {
  const empty = { name: "", phone: "", guardianPhone: "", guardianName: "", courseId: "", school: "", district: "", grade: "", source: "walk_in" as ManualSource, ownerId: "none" };
  const [f, setF] = useState(empty);
  const [err, setErr] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    setF(empty);
    setErr(null);
    setDuplicate(null);
    setTimeout(() => firstRef.current?.focus(), 0);
    return () => {
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;
  const set = (k: keyof typeof empty, v: string) => {
    setF((x) => ({ ...x, [k]: v }));
    if (k === "phone") {
      setErr(null);
      setDuplicate(null);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const phone = f.phone.trim();
    // S8: as the prototype, the student's phone is required.
    if (!NEPALI_MOBILE.test(phone)) return setErr(PHONE_ERROR);
    if (f.guardianPhone.trim() && !NEPALI_MOBILE.test(f.guardianPhone.trim())) return setErr(`Guardian phone: ${PHONE_ERROR.charAt(0).toLowerCase()}${PHONE_ERROR.slice(1)}`);
    setBusy(true);
    setErr(null);
    setDuplicate(null);
    try {
      const r = await crmApi.createProspect({
        name: f.name.trim(),
        phone,
        guardianName: f.guardianName.trim() || undefined,
        guardianPhone: f.guardianPhone.trim() || undefined,
        courseId: f.courseId || undefined,
        school: f.school.trim() || undefined,
        district: f.district.trim() || undefined,
        grade: f.grade ? Number(f.grade) : undefined,
        source: f.source,
        ownerId: f.ownerId === "none" ? undefined : f.ownerId,
      });
      onClose();
      onCreated(r.lead._id);
    } catch (e: any) {
      // The server's duplicate answer never says who it is (Sales can't see that person).
      if (e?.status === 409) setDuplicate(e.message || "This person is already in the CRM.");
      else setErr(e?.message || "Could not add the lead");
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && !busy) {
      e.stopPropagation();
      onClose();
    }
  };

  return (
    <>
      <div className="crm-overlay" onClick={() => !busy && onClose()} />
      <div className="crm-modal" role="dialog" aria-modal="true" aria-labelledby="add-lead-title" onKeyDown={onKeyDown}>
        <div className="crm-card-h">
          <h2 id="add-lead-title">Add lead</h2>
          <button type="button" className="crm-btn sm" onClick={onClose} disabled={busy}>
            Close
          </button>
        </div>
        <form className="crm-card-b" onSubmit={submit}>
          <div className="crm-form">
            <Field label="Student name" full>
              <input ref={firstRef} className="crm-input" required minLength={2} maxLength={200} value={f.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Student phone">
              <input className="crm-input" inputMode="numeric" placeholder="98XXXXXXXX" maxLength={10} required value={f.phone} onChange={(e) => set("phone", e.target.value.trim())} />
            </Field>
            <Field label="Guardian phone">
              <input className="crm-input" inputMode="numeric" placeholder="Optional" maxLength={10} value={f.guardianPhone} onChange={(e) => set("guardianPhone", e.target.value.trim())} />
            </Field>
            <Field label="Guardian name">
              <input className="crm-input" placeholder="Optional" maxLength={200} value={f.guardianName} onChange={(e) => set("guardianName", e.target.value)} />
            </Field>
            <Field label="Course interest">
              <Sel value={f.courseId} onChange={(e) => set("courseId", e.target.value)} options={[{ value: "", label: "None" }, ...courses.map((c) => ({ value: c._id, label: c.title }))]} />
            </Field>
            <Field label="School">
              <input className="crm-input" maxLength={200} value={f.school} onChange={(e) => set("school", e.target.value)} />
            </Field>
            <Field label="District">
              <input className="crm-input" maxLength={100} value={f.district} onChange={(e) => set("district", e.target.value)} />
            </Field>
            <Field label="Grade">
              <Sel value={f.grade} onChange={(e) => set("grade", e.target.value)} options={[{ value: "", label: "Not known" }, ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Grade ${i + 1}` }))]} />
            </Field>
            <Field label="Source">
              <Sel value={f.source} onChange={(e) => set("source", e.target.value)} options={(Object.keys(MANUAL_SOURCE_LABELS) as ManualSource[]).map((s) => ({ value: s, label: MANUAL_SOURCE_LABELS[s] }))} />
            </Field>
            {reps.length > 0 && (
              <Field label="Assign to">
                <Sel value={f.ownerId} onChange={(e) => set("ownerId", e.target.value)} options={[{ value: "none", label: "Leave unassigned" }, ...reps.filter((r) => r.status === "active").map((r) => ({ value: r._id, label: r.name }))]} />
              </Field>
            )}
          </div>
          {(err || duplicate) && (
            <div className="crm-note" style={{ color: "var(--crm-bad)" }} role="alert">
              {err || duplicate}
            </div>
          )}
          <div className="crm-actions">
            <button className="crm-btn primary" type="submit" disabled={busy}>
              {busy ? "Adding…" : "Add lead"}
            </button>
            <button className="crm-btn" type="button" onClick={onClose} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

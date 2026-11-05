"use client";

// The Leads table's Next follow-up cell (R88): the due time as a button that
// opens a small form (Type · Due · Note, the drawer's Schedule / Edit
// follow-up fields) placed on the page like the stage menu, so the table's
// scroll area doesn't cut it off. A lead with an open follow-up edits it (one
// per lead, R75); one without gets a new one. The server applies the same
// rules as the drawer (outreach gate, stale-edit check). Esc and a click
// outside close it; scrolling keeps it next to its cell.
import { CSSProperties, FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Btn, Sel, fromLocalInput, toLocalInput, useBusy } from "@/components/crm/leads/controls";
import { FOLLOW_UP_TYPES, taskChannel } from "@/components/crm/contact-panel";
import { LeadRow, TASK_TYPE_LABELS, crmApi, relDateTime } from "@/lib/crm/api";

const PANEL_W = 300;
const PANEL_H = 300;

export function FollowUpMenu({ row, onSaved }: { row: LeadRow; onSaved: (msg: string) => void }) {
  const task = row.nextTask;
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<CSSProperties | undefined>(undefined);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [type, setType] = useState("call");
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");
  const { busy, error, setError, run } = useBusy();

  // An older follow-up may have a type the form doesn't offer; keep it selectable.
  const types = task && !FOLLOW_UP_TYPES.some((t) => t.value === task.type) ? [...FOLLOW_UP_TYPES, { value: task.type, label: TASK_TYPE_LABELS[task.type] || task.type }] : FOLLOW_UP_TYPES;

  const show = () => {
    setType(task?.type ?? "call");
    setDueAt(toLocalInput(task ? new Date(task.dueAt) : new Date(Date.now() + 24 * 3600_000)));
    setNotes(task?.notes ?? "");
    setError(null);
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    btnRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const position = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const below = window.innerHeight - r.bottom > PANEL_H;
      setPlace({ position: "fixed", left: Math.max(8, Math.min(r.left, window.innerWidth - PANEL_W - 8)), ...(below ? { top: r.bottom + 6 } : { bottom: window.innerHeight - r.top + 6 }), zIndex: 40, width: `min(${PANEL_W}px, calc(100vw - 16px))` });
    };
    position();
    document.addEventListener("mousedown", outside);
    window.addEventListener("scroll", position, true);
    window.addEventListener("resize", position);
    wrapRef.current?.querySelector<HTMLSelectElement>("select")?.focus();
    return () => {
      document.removeEventListener("mousedown", outside);
      window.removeEventListener("scroll", position, true);
      window.removeEventListener("resize", position);
    };
  }, [open]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (open && e.key === "Escape") {
      e.stopPropagation();
      close();
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!dueAt || busy) return;
    run(async () => {
      const body = { type, dueAt: fromLocalInput(dueAt), notes: notes.trim(), ...taskChannel(type) };
      if (task) await crmApi.updateTask(task._id, { ...body, expectedDueAt: task.dueAt });
      else await crmApi.createTask(row._id, { ...body, notes: notes.trim() || undefined });
      setOpen(false);
      onSaved(task ? "Follow-up updated" : "Follow-up scheduled");
    });
  };

  return (
    <span ref={wrapRef} className="crm-stage" onKeyDown={onKeyDown}>
      <button
        ref={btnRef}
        type="button"
        className={cn("crm-fu-btn", row.overdue && "crm-late", !task && "crm-muted")}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={task ? `Next follow-up ${relDateTime(task.dueAt)}. Edit follow-up` : "No follow-up. Schedule follow-up"}
        onClick={() => (open ? setOpen(false) : show())}
      >
        {task ? relDateTime(task.dueAt) : "None set"}
        <span className="crm-chev" aria-hidden>
          ✎
        </span>
      </button>
      {open && (
        <form className="crm-fu-form" role="dialog" aria-label={task ? "Edit follow-up" : "Schedule follow-up"} style={place} onSubmit={submit}>
          <b className="crm-small">{task ? "Edit follow-up" : "Schedule follow-up"}</b>
          <label className="crm-f">
            Type
            <Sel value={type} onChange={(e) => setType(e.target.value)} options={types} />
          </label>
          <label className="crm-f">
            Due
            <input className="crm-input" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} required />
          </label>
          <label className="crm-f">
            Note
            <input className="crm-input" placeholder="e.g. Send demo class link" value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} />
          </label>
          {error && (
            <div className="crm-note bad" role="alert">
              {error}
            </div>
          )}
          <div className="crm-actions">
            <Btn type="submit" tone="primary" sm busy={busy} disabled={!dueAt}>
              {busy ? "Saving…" : task ? "Save" : "Schedule"}
            </Btn>
            <Btn sm onClick={close} disabled={busy}>
              Cancel
            </Btn>
          </div>
        </form>
      )}
    </span>
  );
}

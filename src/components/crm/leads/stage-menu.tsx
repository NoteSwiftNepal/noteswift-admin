"use client";

// The stage dropdown (R70, S9): the drawer header's stage pill, with a chevron,
// opening a menu of the six stages. What is allowed, and why not, comes from
// the server's stageOptions; picking an option hands it to the drawer, which
// opens that option's panel. Esc and a click outside close the menu.
import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { STAGE, Stage, StageOption } from "@/lib/crm/api";

export function StageMenu({ stage, options, onPick }: { stage: Stage; options: StageOption[]; onPick: (to: Stage) => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const st = STAGE[stage];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    // Focus the first enabled option when the menu opens.
    wrapRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus();
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (!open) return;
    if (e.key === "Escape") {
      e.stopPropagation(); // don't close the drawer
      setOpen(false);
      btnRef.current?.focus();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const items = Array.from(wrapRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []);
      const i = items.indexOf(document.activeElement as HTMLButtonElement);
      items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
    }
  };

  return (
    <span ref={wrapRef} className="crm-stage" onKeyDown={onKeyDown}>
      <button ref={btnRef} type="button" className={cn("crm-pill crm-stage-btn", st.tone)} aria-haspopup="menu" aria-expanded={open} aria-label={`Stage: ${st.label}. Change stage`} onClick={() => setOpen((o) => !o)}>
        {st.label}
        <span className="crm-chev" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="crm-menu" role="menu" aria-label="Move to stage">
          {options.map((o) => (
            <button
              key={o.to}
              type="button"
              role="menuitem"
              disabled={!o.allowed}
              aria-current={o.to === stage}
              onClick={() => {
                setOpen(false);
                onPick(o.to);
              }}
            >
              <span>
                {STAGE[o.to].label}
                {o.to === stage ? " (now)" : ""}
              </span>
              {!o.allowed && o.reason && o.to !== stage && <span className="crm-why">{o.reason}</span>}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

"use client";

// The prototype's own controls for the Leads section (S1b, R53): buttons,
// labelled fields, native selects and the inline panel, drawn with the
// crm-btn / crm-input / crm-f / crm-panel classes (crm.css). No data or rules.
import { FormEvent, ReactNode, SelectHTMLAttributes, useState } from "react";
import { cn } from "@/lib/utils";

type BtnProps = {
  children: ReactNode;
  onClick?: () => void;
  tone?: "primary" | "good" | "danger";
  sm?: boolean;
  type?: "button" | "submit";
  busy?: boolean;
  /** When set, the button stays in place, disabled, and says why in a tooltip. */
  disabledReason?: string | null;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
};

export function Btn({ children, onClick, tone, sm, type = "button", busy, disabledReason, disabled, className, ariaLabel }: BtnProps) {
  const off = !!disabledReason || disabled || busy;
  const button = (
    <button type={type} className={cn("crm-btn", tone, sm && "sm", className)} onClick={onClick} disabled={off} aria-label={ariaLabel}>
      {children}
    </button>
  );
  // A disabled button gets no pointer events, so the tooltip sits on a wrapper.
  return disabledReason ? (
    <span title={disabledReason} className="inline-flex">
      {button}
      <span className="sr-only">({disabledReason})</span>
    </span>
  ) : (
    button
  );
}

export function Field({ label, full, row, children, htmlFor }: { label: ReactNode; full?: boolean; row?: boolean; children: ReactNode; htmlFor?: string }) {
  return (
    <label className={cn("crm-f", full && "crm-full", row && "crm-row")} htmlFor={htmlFor}>
      {row ? (
        <>
          {children}
          {label}
        </>
      ) : (
        <>
          {label}
          {children}
        </>
      )}
    </label>
  );
}

export function Sel({ options, className, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }) {
  return (
    <select className={cn("crm-input", className)} {...rest}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** The prototype's inline form block: title, fields, then the actions row. */
export function Panel({
  title,
  children,
  onSubmit,
  submitLabel,
  onCancel,
  busy,
  canSubmit = true,
  error,
  extraActions,
}: {
  title: ReactNode;
  children: ReactNode;
  onSubmit?: () => void | Promise<void>;
  submitLabel?: string;
  onCancel: () => void;
  busy?: boolean;
  canSubmit?: boolean;
  error?: string | null;
  extraActions?: ReactNode;
}) {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (onSubmit && canSubmit && !busy) onSubmit();
  };
  return (
    <form className="crm-panel" onSubmit={submit} aria-label={typeof title === "string" ? title : undefined}>
      <h3>{title}</h3>
      {children}
      {error && (
        <div className="crm-note bad" role="alert">
          {error}
        </div>
      )}
      <div className="crm-actions">
        {extraActions}
        {onSubmit && submitLabel && (
          <Btn type="submit" tone="primary" busy={busy} disabled={!canSubmit}>
            {busy ? "Saving…" : submitLabel}
          </Btn>
        )}
        <Btn onClick={onCancel} disabled={busy}>
          Cancel
        </Btn>
      </div>
    </form>
  );
}

/** Wraps an async action with the busy flag and the server's message. */
export function useBusy() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e: any) {
      setError(e?.reasons?.join("; ") || e?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, run };
}

// <input type="datetime-local"> works in local time; convert both ways.
export const toLocalInput = (d: Date) => {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
};
export const fromLocalInput = (v: string) => new Date(v).toISOString();

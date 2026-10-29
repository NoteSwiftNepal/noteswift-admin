"use client";

// Presentational pieces of the Sales & CRM look (docs/crm-prototype/UI_SPEC.md §3).
// No data fetching or business rules here: pages pass in what to show.
import { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "accent" | "good" | "warn" | "bad";

export function CrmPill({ tone = "neutral", className, title, children }: { tone?: Tone; className?: string; title?: string; children: ReactNode }) {
  return (
    <span className={cn("crm-pill", tone !== "neutral" && tone, className)} title={title}>
      {children}
    </span>
  );
}

/** Breadcrumb + title + subtitle on the left, actions on the right. */
export function CrmPageHeader({ title, subtitle, crumb, actions }: { title: ReactNode; subtitle?: ReactNode; crumb?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {crumb && (
        <div className="crm-crumb">
          Sales &amp; CRM / <b>{crumb}</b>
        </div>
      )}
      <div className="crm-page-head">
        <div className="min-w-0">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions && <div className="crm-actions">{actions}</div>}
      </div>
    </div>
  );
}

export function CrmKpi({ label, value, caption, tone, href }: { label: ReactNode; value: ReactNode; caption?: ReactNode; tone?: "good" | "warn" | "bad"; href?: string }) {
  const body = (
    <>
      <span className="crm-kpi-l">{label}</span>
      <span className="crm-kpi-v">{value}</span>
      {caption && <span className="crm-muted crm-small">{caption}</span>}
    </>
  );
  return href ? (
    <Link href={href} className={cn("crm-kpi", tone)}>
      {body}
    </Link>
  ) : (
    <div className={cn("crm-kpi", tone)}>{body}</div>
  );
}

export function CrmKpis({ children }: { children: ReactNode }) {
  return <div className="crm-kpis">{children}</div>;
}

/** Card with an optional header row (title on the left, `aside` on the right). */
export function CrmCard({ title, aside, className, bodyClassName, flush, children }: { title?: ReactNode; aside?: ReactNode; className?: string; bodyClassName?: string; flush?: boolean; children?: ReactNode }) {
  return (
    <section className={cn("crm-card", className)}>
      {(title || aside) && (
        <div className="crm-card-h">
          {typeof title === "string" ? <h2>{title}</h2> : title}
          {aside}
        </div>
      )}
      {flush ? children : <div className={cn("crm-card-b", bodyClassName)}>{children}</div>}
    </section>
  );
}

/** Underline tabs with optional counts (a plain tablist; the page owns the state). */
export function CrmTabs<T extends string>({ tabs, value, onChange, label }: { tabs: { value: T; label: string; count?: number | null }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="crm-tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.value} type="button" role="tab" aria-selected={value === t.value} className="crm-tab" onClick={() => onChange(t.value)}>
          {t.label}
          {t.count != null && <span className="crm-tab-n">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function CrmTable({ children }: { children: ReactNode }) {
  return (
    <div className="crm-tw">
      <table className="crm-table">{children}</table>
    </div>
  );
}

export function CrmBar({ value, tone }: { value: number; tone?: "good" | "warn" | "bad" }) {
  return (
    <div className="crm-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(1, Math.max(0, value)) * 100)}>
      <i className={tone} style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  );
}

/** Inline form block (accent border and background). */
export function CrmPanel({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="crm-panel">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export function CrmSelectionBar({ count, children }: { count: number; children: ReactNode }) {
  return (
    <div className="crm-selbar">
      <b>{count} selected</b>
      {children}
    </div>
  );
}

export function CrmNote({ tone, children }: { tone?: "bad"; children: ReactNode }) {
  return <div className={cn("crm-note", tone)}>{children}</div>;
}

export function CrmFacts({ items }: { items: { label: ReactNode; value: ReactNode }[] }) {
  return (
    <dl className="crm-facts">
      {items.map((f, i) => (
        <div key={i}>
          <dt>{f.label}</dt>
          <dd>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function CrmTimeline({ children }: { children: ReactNode }) {
  return <div className="crm-timeline">{children}</div>;
}

export function CrmEvent({ tone, children }: { tone?: "good" | "bad" | "muted"; children: ReactNode }) {
  return (
    <div className="crm-ev">
      <span className={cn("crm-dot", tone)} aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Classes for the prototype's green "good" button (Done, Approve) on a default shadcn Button. */
export const GOOD_BUTTON = "bg-[var(--crm-good)] text-white hover:bg-[var(--crm-good)] hover:brightness-110";

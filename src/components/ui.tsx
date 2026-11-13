import type { ReactNode } from "react";
import { CLIENT_STATUS_LABELS, FILE_CATEGORY_LABELS, type ClientStatus, type FileCategory } from "@/lib/types";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return "—";
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ar-EG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function timeAgo(value: string) {
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const diff = Date.now() - new Date(normalized).getTime();
  const mins = Math.round(diff / 60000);
  const relativeTime = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });
  if (mins < 1) return relativeTime.format(0, "minute");
  if (mins < 60) return relativeTime.format(-mins, "minute");
  const hours = Math.round(mins / 60);
  if (hours < 24) return relativeTime.format(-hours, "hour");
  const days = Math.round(hours / 24);
  if (days < 30) return relativeTime.format(-days, "day");
  return formatDate(value);
}

export function formatBytes(bytes: number) {
  if (!bytes) return "0 بايت";
  const units = ["بايت", "كيلوبايت", "ميجابايت", "جيجابايت"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 gap-2">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "accent" | "warn" | "muted";
}) {
  const tones = {
    default: "text-white",
    accent: "text-accent-500",
    warn: "text-amber-300",
    muted: "text-zinc-400",
  } as const;
  return (
    <div className="card p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className={cn("mt-2 text-3xl font-semibold tracking-tight", tones[tone])}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export function StatusBadge({ status }: { status: ClientStatus }) {
  const styles: Record<ClientStatus, string> = {
    active: "border-accent-600/40 bg-accent-500/10 text-accent-400",
    pending: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    inactive: "border-zinc-600/50 bg-zinc-500/10 text-zinc-400",
    suspended: "border-red-500/40 bg-red-500/10 text-red-300",
  };
  return (
    <span className={cn("badge", styles[status])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {CLIENT_STATUS_LABELS[status]}
    </span>
  );
}

export function CategoryBadge({ category }: { category: FileCategory }) {
  return (
    <span className="badge border-ink-600 bg-ink-800 text-zinc-300">
      {FILE_CATEGORY_LABELS[category] ?? category}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-700 bg-ink-900/40 px-6 py-14 text-center">
      {icon ? <div className="mb-3 text-zinc-600">{icon}</div> : null}
      <p className="text-sm font-semibold text-zinc-200">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-zinc-500">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  htmlFor?: string;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export function Alert({
  tone = "error",
  children,
}: {
  tone?: "error" | "success" | "info";
  children: ReactNode;
}) {
  const styles = {
    error: "border-red-500/30 bg-red-500/10 text-red-200",
    success: "border-accent-600/30 bg-accent-500/10 text-accent-300",
    info: "border-ink-600 bg-ink-800/70 text-zinc-300",
  } as const;
  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm leading-relaxed", styles[tone])}>
      {children}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("card p-5 sm:p-6", className)}>
      {(title || action) && (
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            {title ? <h2 className="text-base font-semibold text-white">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-zinc-400">{description}</p> : null}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Flash({ message, tone = "success" }: { message?: string; tone?: "success" | "error" }) {
  if (!message) return null;
  return (
    <div className="mb-5">
      <Alert tone={tone}>{message}</Alert>
    </div>
  );
}

export function MacroPill({
  label,
  value,
  unit = "جم",
}: {
  label: string;
  value: number | null;
  unit?: string;
}) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900/60 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">
        {value ?? "—"}
        <span className="mr-0.5 text-xs font-medium text-zinc-500">{value != null ? unit : ""}</span>
      </p>
    </div>
  );
}

export type JobKind = "installation" | "service";

const LABELS: Record<JobKind, string> = {
  installation: "Installation",
  service: "Service",
};

export function JobKindBadge({ kind, className = "" }: { kind: JobKind; className?: string }) {
  const label = LABELS[kind] ?? kind;
  const styles =
    kind === "service"
      ? "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-100"
      : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100";
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles} ${className}`.trim()}
    >
      {label}
    </span>
  );
}

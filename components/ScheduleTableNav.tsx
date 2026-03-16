"use client";

import Link from "next/link";

type ScheduleTableNavProps = {
  /** First day of current 2-week window (YYYY-MM-DD) */
  tableStartStr: string;
  /** Current view (e.g. "all", "crew:xxx", "person:xxx") */
  view: string;
  /** layout param: "month" | "week" | "day" */
  layout: string | undefined;
  /** week param for week view (YYYY-MM-DD) */
  weekStartStr: string;
  /** date param for day view (YYYY-MM-DD) */
  dateStr: string | undefined;
};

const TABLE_DAYS = 14;

function buildBaseQuery(view: string, layout: string | undefined, weekStartStr: string, dateStr: string | undefined): string {
  const params = new URLSearchParams();
  if (view !== "all") params.set("view", view);
  if (layout) params.set("layout", layout);
  if (layout === "week" && weekStartStr) params.set("week", weekStartStr);
  if (layout === "day" && dateStr) params.set("date", dateStr);
  const q = params.toString();
  return q ? `?${q}` : "";
}

export function ScheduleTableNav({
  tableStartStr,
  view,
  layout,
  weekStartStr,
  dateStr,
}: ScheduleTableNavProps) {
  const base = buildBaseQuery(view, layout, weekStartStr, dateStr);
  const prefix = base ? `${base}&` : "?";
  const prevStart = new Date(tableStartStr + "T12:00:00");
  prevStart.setDate(prevStart.getDate() - TABLE_DAYS);
  const prevStr = prevStart.toISOString().slice(0, 10);
  const nextStart = new Date(tableStartStr + "T12:00:00");
  nextStart.setDate(nextStart.getDate() + TABLE_DAYS);
  const nextStr = nextStart.toISOString().slice(0, 10);

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Link
        href={`/admin/schedule${prefix}table_start=${prevStr}`}
        className="rounded-lg border border-border bg-card px-2.5 py-1.5 font-medium text-foreground transition hover:bg-muted touch-manipulation"
      >
        Previous 2 weeks
      </Link>
      <Link
        href={`/admin/schedule${prefix}table_start=${nextStr}`}
        className="rounded-lg border border-border bg-card px-2.5 py-1.5 font-medium text-foreground transition hover:bg-muted touch-manipulation"
      >
        Next 2 weeks
      </Link>
    </div>
  );
}

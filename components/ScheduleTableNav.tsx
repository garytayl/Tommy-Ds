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
  /** Matches schedule `kind` filter */
  kind: "installation" | "service" | null;
};

const TABLE_DAYS = 14;

function buildBaseQuery(
  view: string,
  layout: string | undefined,
  weekStartStr: string,
  dateStr: string | undefined,
  kind: "installation" | "service" | null,
): string {
  const params = new URLSearchParams();
  if (view !== "all") params.set("view", view);
  if (layout) params.set("layout", layout);
  if (layout === "week" && weekStartStr) params.set("week", weekStartStr);
  if (layout === "day" && dateStr) params.set("date", dateStr);
  if (kind) params.set("kind", kind);
  const q = params.toString();
  return q ? `?${q}` : "";
}

export function ScheduleTableNav({
  tableStartStr,
  view,
  layout,
  weekStartStr,
  dateStr,
  kind,
}: ScheduleTableNavProps) {
  const base = buildBaseQuery(view, layout, weekStartStr, dateStr, kind);
  const prefix = base ? `${base}&` : "?";
  const prevStart = new Date(tableStartStr + "T12:00:00");
  prevStart.setDate(prevStart.getDate() - TABLE_DAYS);
  const prevStr = prevStart.toISOString().slice(0, 10);
  const nextStart = new Date(tableStartStr + "T12:00:00");
  nextStart.setDate(nextStart.getDate() + TABLE_DAYS);
  const nextStr = nextStart.toISOString().slice(0, 10);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisWindowStart = new Date(today);
  thisWindowStart.setDate(thisWindowStart.getDate() - thisWindowStart.getDay());
  const thisWindowStr = thisWindowStart.toISOString().slice(0, 10);

  return (
    <div className="schedule-nav-strip animate-card-in schedule-delay-600">
      <div className="schedule-fancy-content flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Table range
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={`/admin/schedule${prefix}table_start=${prevStr}`}
            className="schedule-chip"
          >
            Previous 2 weeks
          </Link>
          <Link
            href={`/admin/schedule${prefix}table_start=${thisWindowStr}`}
            className="schedule-chip"
          >
            This 2 weeks
          </Link>
          <Link
            href={`/admin/schedule${prefix}table_start=${nextStr}`}
            className="schedule-chip"
          >
            Next 2 weeks
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";

type Crew = { id: string; name: string };
type Installer = { user_id: string; full_name: string | null };

type ScheduleControlsProps = {
  view: string;
  isWeekView: boolean;
  isDayView: boolean;
  weekStartStr: string;
  /** When in day view: the selected date (YYYY-MM-DD) */
  dayViewDateKey: string;
  crews: Crew[];
  installers: Installer[];
  viewCrewId: string | null;
  viewPersonId: string | null;
};

function buildLayoutParams(layout: "month" | "week" | "day", weekStartStr: string, dayViewDateKey: string): string {
  const params = new URLSearchParams();
  if (layout !== "month") params.set("layout", layout);
  if (layout === "week") params.set("week", weekStartStr);
  if (layout === "day") params.set("date", dayViewDateKey);
  const q = params.toString();
  return q ? `?${q}` : "";
}

function viewHref(
  viewValue: "all" | string,
  layout: "month" | "week" | "day",
  weekStartStr: string,
  dayViewDateKey: string
): string {
  const layoutPart = buildLayoutParams(layout, weekStartStr, dayViewDateKey);
  const viewPart = viewValue === "all" ? "" : `view=${encodeURIComponent(viewValue)}`;
  const join = layoutPart ? (viewPart ? `${layoutPart}&${viewPart}` : layoutPart) : (viewPart ? `?${viewPart}` : "");
  return `/admin/schedule${join}`;
}

export function ScheduleControls({
  view,
  isWeekView,
  isDayView,
  weekStartStr,
  dayViewDateKey,
  crews,
  installers,
  viewCrewId,
  viewPersonId,
}: ScheduleControlsProps) {
  const prevWeek = new Date(weekStartStr + "T12:00:00");
  prevWeek.setDate(prevWeek.getDate() - 7);
  const prevWeekStr = prevWeek.toISOString().slice(0, 10);
  const nextWeekStart = new Date(weekStartStr + "T12:00:00");
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  const nextWeekStr = nextWeekStart.toISOString().slice(0, 10);
  const prevDay = new Date(dayViewDateKey + "T12:00:00");
  prevDay.setDate(prevDay.getDate() - 1);
  const prevDayStr = prevDay.toISOString().slice(0, 10);
  const nextDay = new Date(dayViewDateKey + "T12:00:00");
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = nextDay.toISOString().slice(0, 10);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const todayWeekStart = new Date(today);
  todayWeekStart.setDate(todayWeekStart.getDate() - todayWeekStart.getDay());
  const todayWeekStr = todayWeekStart.toISOString().slice(0, 10);
  const currentLayout: "month" | "week" | "day" = isDayView ? "day" : isWeekView ? "week" : "month";
  const pillBase =
    "rounded-xl border px-2.5 py-1.5 text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 touch-manipulation";
  const inactivePill = "border-border bg-card text-foreground hover:bg-muted";
  const activePill = "border-primary bg-primary text-primary-foreground shadow-sm";

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-muted/30 p-3 sm:p-4 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="grid gap-3 lg:grid-cols-[auto,1fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Layout</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Link
              href={viewHref(view, "month", weekStartStr, dayViewDateKey)}
              className={`${pillBase} ${!isWeekView && !isDayView ? activePill : inactivePill}`}
            >
              Month
            </Link>
            <Link
              href={viewHref(view, "week", weekStartStr, dayViewDateKey)}
              className={`${pillBase} ${isWeekView ? activePill : inactivePill}`}
            >
              Week
            </Link>
            <Link
              href={viewHref(view, "day", weekStartStr, dayViewDateKey)}
              className={`${pillBase} ${isDayView ? activePill : inactivePill}`}
            >
              Day
            </Link>
          </div>
        </div>

        {(isWeekView || isDayView) && (
          <div className="lg:justify-self-end">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:text-right">
              Navigate
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 lg:justify-end">
              {isWeekView ? (
                <>
                  <Link
                    href={viewHref(view, "week", prevWeekStr, dayViewDateKey)}
                    className={`${pillBase} ${inactivePill}`}
                  >
                    Previous week
                  </Link>
                  <Link
                    href={viewHref(view, "week", todayWeekStr, dayViewDateKey)}
                    className={`${pillBase} ${inactivePill}`}
                  >
                    This week
                  </Link>
                  <Link
                    href={viewHref(view, "week", nextWeekStr, dayViewDateKey)}
                    className={`${pillBase} ${inactivePill}`}
                  >
                    Next week
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href={viewHref(view, "day", weekStartStr, prevDayStr)}
                    className={`${pillBase} ${inactivePill}`}
                  >
                    Previous day
                  </Link>
                  <Link
                    href={viewHref(view, "day", weekStartStr, todayStr)}
                    className={`${pillBase} ${inactivePill}`}
                  >
                    Today
                  </Link>
                  <Link
                    href={viewHref(view, "day", weekStartStr, nextDayStr)}
                    className={`${pillBase} ${inactivePill}`}
                  >
                    Next day
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-border pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            View filter
          </p>
          <p className="text-xs text-muted-foreground">
            Choose all, a crew, or an installer
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={viewHref("all", currentLayout, weekStartStr, dayViewDateKey)}
            className={`${pillBase} ${view === "all" ? activePill : inactivePill}`}
          >
            All schedules
          </Link>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          <div className="rounded-xl border border-border bg-card/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Crews</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {crews.length === 0 ? (
                <span className="text-sm text-muted-foreground">No crews yet</span>
              ) : (
                crews.map((crew) => (
                  <Link
                    key={crew.id}
                    href={
                      viewCrewId === crew.id
                        ? viewHref("all", currentLayout, weekStartStr, dayViewDateKey)
                        : viewHref(`crew:${crew.id}`, currentLayout, weekStartStr, dayViewDateKey)
                    }
                    className={`${pillBase} ${viewCrewId === crew.id ? activePill : inactivePill}`}
                  >
                    {crew.name}
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Installers</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {installers.length === 0 ? (
                <span className="text-sm text-muted-foreground">No installers yet</span>
              ) : (
                installers.map((inst) => (
                  <Link
                    key={inst.user_id}
                    href={
                      viewPersonId === inst.user_id
                        ? viewHref("all", currentLayout, weekStartStr, dayViewDateKey)
                        : viewHref(`person:${inst.user_id}`, currentLayout, weekStartStr, dayViewDateKey)
                    }
                    className={`${pillBase} ${viewPersonId === inst.user_id ? activePill : inactivePill}`}
                  >
                    {inst.full_name ?? inst.user_id}
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

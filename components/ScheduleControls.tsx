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
  /** Filter jobs by installation vs service (URL param `kind`) */
  kindFilter: "installation" | "service" | null;
};

function schedulePageHref(opts: {
  view: string;
  layout: "month" | "week" | "day";
  weekStartStr: string;
  dayViewDateKey: string;
  kind?: "installation" | "service" | null;
}): string {
  const params = new URLSearchParams();
  if (opts.view !== "all") params.set("view", opts.view);
  if (opts.layout !== "month") params.set("layout", opts.layout);
  if (opts.layout === "week") params.set("week", opts.weekStartStr);
  if (opts.layout === "day") params.set("date", opts.dayViewDateKey);
  if (opts.kind) params.set("kind", opts.kind);
  const q = params.toString();
  return `/admin/schedule${q ? `?${q}` : ""}`;
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
  kindFilter,
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
  const pillBase = "schedule-chip";
  const activePill = "schedule-chip-active";

  return (
    <div className="schedule-fancy-panel animate-card-in schedule-delay-75">
      <div className="pointer-events-none absolute -right-16 -top-14 h-44 w-44 rounded-full bg-primary/20 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute -left-20 bottom-2 h-36 w-36 rounded-full bg-accent-gold/10 blur-3xl animate-float-delayed" />
      <div className="schedule-fancy-content space-y-4 p-3 sm:p-4">
      <div className="grid gap-3 lg:grid-cols-[auto,1fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent-gold animate-pulse-slow" />
            Layout
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Link
              href={schedulePageHref({ view, layout: "month", weekStartStr, dayViewDateKey, kind: kindFilter })}
              className={`${pillBase} ${!isWeekView && !isDayView ? activePill : ""}`}
            >
              Month
            </Link>
            <Link
              href={schedulePageHref({ view, layout: "week", weekStartStr, dayViewDateKey, kind: kindFilter })}
              className={`${pillBase} ${isWeekView ? activePill : ""}`}
            >
              Week
            </Link>
            <Link
              href={schedulePageHref({ view, layout: "day", weekStartStr, dayViewDateKey, kind: kindFilter })}
              className={`${pillBase} ${isDayView ? activePill : ""}`}
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
                    href={schedulePageHref({ view, layout: "week", weekStartStr: prevWeekStr, dayViewDateKey, kind: kindFilter })}
                    className={pillBase}
                  >
                    Previous week
                  </Link>
                  <Link
                    href={schedulePageHref({ view, layout: "week", weekStartStr: todayWeekStr, dayViewDateKey, kind: kindFilter })}
                    className={pillBase}
                  >
                    This week
                  </Link>
                  <Link
                    href={schedulePageHref({ view, layout: "week", weekStartStr: nextWeekStr, dayViewDateKey, kind: kindFilter })}
                    className={pillBase}
                  >
                    Next week
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href={schedulePageHref({ view, layout: "day", weekStartStr, dayViewDateKey: prevDayStr, kind: kindFilter })}
                    className={pillBase}
                  >
                    Previous day
                  </Link>
                  <Link
                    href={schedulePageHref({ view, layout: "day", weekStartStr, dayViewDateKey: todayStr, kind: kindFilter })}
                    className={pillBase}
                  >
                    Today
                  </Link>
                  <Link
                    href={schedulePageHref({ view, layout: "day", weekStartStr, dayViewDateKey: nextDayStr, kind: kindFilter })}
                    className={pillBase}
                  >
                    Next day
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-border/80 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse-slow" />
            View filter
          </p>
          <p className="text-xs text-muted-foreground">
            Choose all, a crew, or an installer
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={schedulePageHref({ view: "all", layout: currentLayout, weekStartStr, dayViewDateKey, kind: kindFilter })}
            className={`${pillBase} ${view === "all" ? activePill : ""}`}
          >
            All schedules
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/80 pt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Job kind
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={schedulePageHref({ view, layout: currentLayout, weekStartStr, dayViewDateKey, kind: null })}
              className={`${pillBase} ${!kindFilter ? activePill : ""}`}
            >
              All kinds
            </Link>
            <Link
              href={schedulePageHref({ view, layout: currentLayout, weekStartStr, dayViewDateKey, kind: "installation" })}
              className={`${pillBase} ${kindFilter === "installation" ? activePill : ""}`}
            >
              Installation
            </Link>
            <Link
              href={schedulePageHref({ view, layout: currentLayout, weekStartStr, dayViewDateKey, kind: "service" })}
              className={`${pillBase} ${kindFilter === "service" ? activePill : ""}`}
            >
              Service
            </Link>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          <div className="schedule-subcard">
            <div className="p-3">
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
                        ? schedulePageHref({ view: "all", layout: currentLayout, weekStartStr, dayViewDateKey, kind: kindFilter })
                        : schedulePageHref({ view: `crew:${crew.id}`, layout: currentLayout, weekStartStr, dayViewDateKey, kind: kindFilter })
                    }
                    className={`${pillBase} ${viewCrewId === crew.id ? activePill : ""}`}
                  >
                    {crew.name}
                  </Link>
                ))
              )}
            </div>
            </div>
          </div>

          <div className="schedule-subcard">
            <div className="p-3">
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
                        ? schedulePageHref({ view: "all", layout: currentLayout, weekStartStr, dayViewDateKey, kind: kindFilter })
                        : schedulePageHref({ view: `person:${inst.user_id}`, layout: currentLayout, weekStartStr, dayViewDateKey, kind: kindFilter })
                    }
                    className={`${pillBase} ${viewPersonId === inst.user_id ? activePill : ""}`}
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
      </div>
    </div>
  );
}

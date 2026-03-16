"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

type Crew = { id: string; name: string };
type Installer = { user_id: string; full_name: string | null };

type ScheduleControlsProps = {
  view: string;
  isWeekView: boolean;
  isDayView: boolean;
  weekStartStr: string;
  weekEndStr: string;
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

function viewLabel(view: string, crews: Crew[], installers: Installer[], viewCrewId: string | null, viewPersonId: string | null) {
  if (view === "all") return "All";
  if (viewCrewId) return crews.find((c) => c.id === viewCrewId)?.name ?? "Crew";
  if (viewPersonId) return installers.find((i) => i.user_id === viewPersonId)?.full_name ?? "Person";
  return "View";
}

export function ScheduleControls({
  view,
  isWeekView,
  isDayView,
  weekStartStr,
  weekEndStr,
  dayViewDateKey,
  crews,
  installers,
  viewCrewId,
  viewPersonId,
}: ScheduleControlsProps) {
  const [viewOpen, setViewOpen] = useState(false);
  const prevWeek = new Date(weekStartStr + "T12:00:00");
  prevWeek.setDate(prevWeek.getDate() - 7);
  const prevWeekStr = prevWeek.toISOString().slice(0, 10);
  const prevDay = new Date(dayViewDateKey + "T12:00:00");
  prevDay.setDate(prevDay.getDate() - 1);
  const prevDayStr = prevDay.toISOString().slice(0, 10);
  const nextDay = new Date(dayViewDateKey + "T12:00:00");
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = nextDay.toISOString().slice(0, 10);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const currentLayout: "month" | "week" | "day" = isDayView ? "day" : isWeekView ? "week" : "month";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center rounded-2xl border border-border bg-muted/30 px-3 py-2.5 sm:px-4 shadow-sm transition-shadow duration-200 hover:shadow-md">
      {/* Layout: Month | Week | Day + nav for week/day */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground sm:text-sm">Layout</span>
        <div className="flex items-center gap-1">
          <Link
            href={viewHref(view, "month", weekStartStr, dayViewDateKey)}
            className={`rounded-xl px-2.5 py-1.5 text-sm font-medium transition-all duration-200 touch-manipulation hover:scale-105 active:scale-95 ${
              !isWeekView && !isDayView ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-muted"
            }`}
          >
            Month
          </Link>
          <Link
            href={viewHref(view, "week", weekStartStr, dayViewDateKey)}
            className={`rounded-xl px-2.5 py-1.5 text-sm font-medium transition-all duration-200 touch-manipulation hover:scale-105 active:scale-95 ${
              isWeekView ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-muted"
            }`}
          >
            Week
          </Link>
          <Link
            href={viewHref(view, "day", weekStartStr, dayViewDateKey)}
            className={`rounded-xl px-2.5 py-1.5 text-sm font-medium transition-all duration-200 touch-manipulation hover:scale-105 active:scale-95 ${
              isDayView ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-muted"
            }`}
          >
            Day
          </Link>
        </div>
        {isWeekView && (
          <>
            <span className="text-muted-foreground hidden sm:inline">|</span>
            <Link
              href={viewHref(view, "week", prevWeekStr, dayViewDateKey)}
              className="rounded-xl px-2.5 py-1.5 text-sm font-medium text-foreground transition-all duration-200 hover:scale-105 hover:bg-muted active:scale-95 touch-manipulation"
            >
              Previous week
            </Link>
            <Link
              href={viewHref(view, "week", weekEndStr, dayViewDateKey)}
              className="rounded-xl px-2.5 py-1.5 text-sm font-medium text-foreground transition-all duration-200 hover:scale-105 hover:bg-muted active:scale-95 touch-manipulation"
            >
              Next week
            </Link>
          </>
        )}
        {isDayView && (
          <>
            <span className="text-muted-foreground hidden sm:inline">|</span>
            <Link
              href={viewHref(view, "day", weekStartStr, prevDayStr)}
              className="rounded-xl px-2.5 py-1.5 text-sm font-medium text-foreground transition-all duration-200 hover:scale-105 hover:bg-muted active:scale-95 touch-manipulation"
            >
              Previous day
            </Link>
            <Link
              href={viewHref(view, "day", weekStartStr, todayStr)}
              className="rounded-xl px-2.5 py-1.5 text-sm font-medium text-foreground transition-all duration-200 hover:scale-105 hover:bg-muted active:scale-95 touch-manipulation"
            >
              Today
            </Link>
            <Link
              href={viewHref(view, "day", weekStartStr, nextDayStr)}
              className="rounded-xl px-2.5 py-1.5 text-sm font-medium text-foreground transition-all duration-200 hover:scale-105 hover:bg-muted active:scale-95 touch-manipulation"
            >
              Next day
            </Link>
          </>
        )}
      </div>

      {/* View: All | crews | people — dropdown on small screens */}
      <div className="flex items-center gap-2 sm:ml-auto">
        <span className="text-xs font-medium text-muted-foreground sm:text-sm">View</span>
        <div className="relative">
          {/* Desktop: inline pills */}
          <div className="hidden sm:flex flex-wrap items-center gap-1">
            <Link
              href={viewHref("all", currentLayout, weekStartStr, dayViewDateKey)}
              className={`rounded-xl px-2.5 py-1.5 text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
                view === "all" ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-muted"
              }`}
            >
              All
            </Link>
            {crews.map((crew) => (
              <Link
                key={crew.id}
                href={viewCrewId === crew.id ? viewHref("all", currentLayout, weekStartStr, dayViewDateKey) : viewHref(`crew:${crew.id}`, currentLayout, weekStartStr, dayViewDateKey)}
                className={`rounded-xl px-2.5 py-1.5 text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
                  viewCrewId === crew.id ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-muted"
                }`}
              >
                {crew.name}
              </Link>
            ))}
            {installers.map((inst) => (
              <Link
                key={inst.user_id}
                href={viewPersonId === inst.user_id ? viewHref("all", currentLayout, weekStartStr, dayViewDateKey) : viewHref(`person:${inst.user_id}`, currentLayout, weekStartStr, dayViewDateKey)}
                className={`rounded-xl px-2.5 py-1.5 text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
                  viewPersonId === inst.user_id ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-muted"
                }`}
              >
                {inst.full_name ?? inst.user_id}
              </Link>
            ))}
          </div>
          {/* Mobile: collapsible dropdown */}
          <div className="sm:hidden">
            <button
              type="button"
              onClick={() => setViewOpen((o) => !o)}
              className="flex items-center gap-1 rounded-lg bg-card border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted touch-manipulation"
              aria-expanded={viewOpen}
              aria-haspopup="listbox"
            >
              {viewLabel(view, crews, installers, viewCrewId, viewPersonId)}
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${viewOpen ? "rotate-180" : ""}`} />
            </button>
            {viewOpen && (
              <>
                <div className="fixed inset-0 z-10" aria-hidden onClick={() => setViewOpen(false)} />
                <ul
                  className="absolute left-0 top-full z-20 mt-1 max-h-60 w-48 overflow-auto rounded-lg border border-border bg-popover py-1 shadow-lg"
                  role="listbox"
                >
                  <li>
                    <Link
                      href={viewHref("all", currentLayout, weekStartStr, dayViewDateKey)}
                      className="block px-3 py-2 text-sm text-foreground hover:bg-muted"
                      onClick={() => setViewOpen(false)}
                    >
                      All
                    </Link>
                  </li>
                  {crews.map((crew) => (
                    <li key={crew.id}>
                      <Link
                        href={viewCrewId === crew.id ? viewHref("all", currentLayout, weekStartStr, dayViewDateKey) : viewHref(`crew:${crew.id}`, currentLayout, weekStartStr, dayViewDateKey)}
                        className={`block px-3 py-2 text-sm ${viewCrewId === crew.id ? "bg-primary/20 font-medium text-foreground" : "text-foreground hover:bg-muted"}`}
                        onClick={() => setViewOpen(false)}
                      >
                        {crew.name}
                      </Link>
                    </li>
                  ))}
                  {installers.map((inst) => (
                    <li key={inst.user_id}>
                      <Link
                        href={viewPersonId === inst.user_id ? viewHref("all", currentLayout, weekStartStr, dayViewDateKey) : viewHref(`person:${inst.user_id}`, currentLayout, weekStartStr, dayViewDateKey)}
                        className={`block px-3 py-2 text-sm ${viewPersonId === inst.user_id ? "bg-primary/20 font-medium text-foreground" : "text-foreground hover:bg-muted"}`}
                        onClick={() => setViewOpen(false)}
                      >
                        {inst.full_name ?? inst.user_id}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

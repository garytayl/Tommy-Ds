"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

type Crew = { id: string; name: string };
type Installer = { user_id: string; full_name: string | null };

type ScheduleControlsProps = {
  view: string;
  isWeekView: boolean;
  weekStartStr: string;
  weekEndStr: string;
  crews: Crew[];
  installers: Installer[];
  viewCrewId: string | null;
  viewPersonId: string | null;
};

function viewHref(
  viewValue: "all" | string,
  isWeekView: boolean,
  weekEndStr: string,
  weekStartStr: string
): string {
  if (viewValue === "all") {
    return isWeekView ? `/admin/schedule?layout=week&week=${weekStartStr}` : "/admin/schedule";
  }
  const base = `/admin/schedule?view=${viewValue}`;
  if (isWeekView) return `${base}&layout=week&week=${weekStartStr}`;
  return base;
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
  weekStartStr,
  weekEndStr,
  crews,
  installers,
  viewCrewId,
  viewPersonId,
}: ScheduleControlsProps) {
  const [viewOpen, setViewOpen] = useState(false);
  const prevWeek = new Date(weekStartStr + "T12:00:00");
  prevWeek.setDate(prevWeek.getDate() - 7);
  const prevWeekStr = prevWeek.toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center rounded-xl border border-border bg-muted/30 px-3 py-2.5 sm:px-4">
      {/* Layout: Month | Week + prev/next */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground sm:text-sm">Layout</span>
        <div className="flex items-center gap-1">
          <Link
            href={viewHref(view, false, weekEndStr, weekStartStr)}
            className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition touch-manipulation ${
              !isWeekView ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
            }`}
          >
            Month
          </Link>
          <Link
            href={viewHref(view, true, weekEndStr, weekStartStr)}
            className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition touch-manipulation ${
              isWeekView ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
            }`}
          >
            Week
          </Link>
        </div>
        {isWeekView && (
          <>
            <span className="text-muted-foreground hidden sm:inline">|</span>
            <Link
              href={viewHref(view, true, weekEndStr, prevWeekStr)}
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted touch-manipulation"
            >
              Previous week
            </Link>
            <Link
              href={viewHref(view, true, weekEndStr, weekEndStr)}
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted touch-manipulation"
            >
              Next week
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
              href={viewHref("all", isWeekView, weekEndStr, weekStartStr)}
              className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
                view === "all" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
              }`}
            >
              All
            </Link>
            {crews.map((crew) => (
              <Link
                key={crew.id}
                href={viewCrewId === crew.id ? viewHref("all", isWeekView, weekEndStr, weekStartStr) : viewHref(`crew:${crew.id}`, isWeekView, weekEndStr, weekStartStr)}
                className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
                  viewCrewId === crew.id ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                }`}
              >
                {crew.name}
              </Link>
            ))}
            {installers.map((inst) => (
              <Link
                key={inst.user_id}
                href={viewPersonId === inst.user_id ? viewHref("all", isWeekView, weekEndStr, weekStartStr) : viewHref(`person:${inst.user_id}`, isWeekView, weekEndStr, weekStartStr)}
                className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
                  viewPersonId === inst.user_id ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
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
              <ChevronDown className={`h-4 w-4 transition ${viewOpen ? "rotate-180" : ""}`} />
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
                      href={viewHref("all", isWeekView, weekEndStr, weekStartStr)}
                      className="block px-3 py-2 text-sm text-foreground hover:bg-muted"
                      onClick={() => setViewOpen(false)}
                    >
                      All
                    </Link>
                  </li>
                  {crews.map((crew) => (
                    <li key={crew.id}>
                      <Link
                        href={viewCrewId === crew.id ? viewHref("all", isWeekView, weekEndStr, weekStartStr) : viewHref(`crew:${crew.id}`, isWeekView, weekEndStr, weekStartStr)}
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
                        href={viewPersonId === inst.user_id ? viewHref("all", isWeekView, weekEndStr, weekStartStr) : viewHref(`person:${inst.user_id}`, isWeekView, weekEndStr, weekStartStr)}
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

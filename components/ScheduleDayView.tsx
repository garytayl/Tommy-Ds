"use client";

import Link from "next/link";
import type { ScheduleJob } from "@/components/ScheduleDragDrop";
import { JobStatusBadge } from "@/components/JobStatusBadge";

const FIRST_HOUR = 6;
const LAST_HOUR = 20;
const HOURS = LAST_HOUR - FIRST_HOUR;

function timeToPercent(iso: string): number {
  const d = new Date(iso);
  const minutes = d.getHours() * 60 + d.getMinutes();
  const startMinutes = FIRST_HOUR * 60;
  const rangeMinutes = HOURS * 60;
  return Math.max(0, Math.min(100, ((minutes - startMinutes) / rangeMinutes) * 100));
}

function jobPosition(job: ScheduleJob): { left: number; width: number } {
  const start = job.scheduled_start;
  const end = job.scheduled_end;
  if (!start) return { left: 0, width: (1 / HOURS) * 100 };
  const left = timeToPercent(start);
  let right: number;
  if (end) {
    right = timeToPercent(end);
  } else {
    right = left + (1 / HOURS) * 100;
  }
  const width = Math.max((1 / HOURS) * 100 * 0.5, right - left);
  return { left, width };
}

type ScheduleDayViewProps = {
  /** Date key (YYYY-MM-DD) for this day */
  dateKey: string;
  /** Jobs scheduled on this day */
  jobs: ScheduleJob[];
  /** Optional crew display names for labels */
  crewDisplayNames?: Record<string, string>;
};

export function ScheduleDayView({
  dateKey,
  jobs,
  crewDisplayNames = {},
}: ScheduleDayViewProps) {
  const date = new Date(dateKey + "T12:00:00");
  const label = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  return (
    <section
      className="rounded-xl border border-border bg-card overflow-hidden shadow-sm"
      aria-label={isToday ? `Today: ${label}` : `Day: ${label}`}
    >
      <div className="border-b border-border bg-muted/30 px-3 py-2 sm:px-4">
        <h2 className="text-sm font-semibold text-foreground">
          {isToday ? "Today" : date.toLocaleDateString("en-US", { weekday: "long" })}
        </h2>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <div className="p-3 sm:p-4">
        <div className="flex gap-0 text-xs text-muted-foreground mb-2">
          {Array.from({ length: HOURS + 1 }, (_, i) => FIRST_HOUR + i).map((h) => (
            <div
              key={h}
              className="flex-1 min-w-0 text-center"
              style={{ width: `${100 / HOURS}%` }}
            >
              {h === 12 ? "12p" : h < 12 ? `${h}a` : `${h - 12}p`}
            </div>
          ))}
        </div>
        <div className="relative min-h-[200px] w-full rounded-lg bg-muted/30">
          {jobs.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              No jobs this day
            </div>
          ) : (
            jobs.map((job) => {
              const { left, width } = jobPosition(job);
              const customer = Array.isArray(job.customers)
                ? job.customers[0]?.name
                : job.customers?.name;
              const crew = Array.isArray(job.crews) ? job.crews[0] : job.crews;
              const crewName =
                (job.assigned_crew_id && crewDisplayNames[job.assigned_crew_id]) ?? crew?.name;
              return (
                <div
                  key={job.id}
                  className="absolute top-1 bottom-1 rounded-md bg-primary/90 text-primary-foreground overflow-hidden shadow-sm cursor-grab active:cursor-grabbing touch-manipulation hover:bg-primary flex flex-col justify-center min-w-[min(6rem,100%)]"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                  }}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/x-job-id", job.id);
                    e.dataTransfer.setData("application/x-job-start", job.scheduled_start ?? "");
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => {}}
                >
                  <Link
                    href={`/jobs/${job.id}`}
                    className="block w-full truncate px-2 py-1 text-xs font-medium space-y-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="truncate block font-semibold">{job.title}</span>
                    {job.scheduled_start && (
                      <span className="opacity-90 text-[10px] block">
                        {new Date(job.scheduled_start).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {job.scheduled_end &&
                          ` – ${new Date(job.scheduled_end).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}`}
                      </span>
                    )}
                    {customer && (
                      <span className="opacity-90 text-[10px] block truncate">{customer}</span>
                    )}
                    {crewName && (
                      <span className="opacity-80 text-[10px] block truncate">{crewName}</span>
                    )}
                    <span className="inline-block mt-0.5">
                      <JobStatusBadge status={job.status} />
                    </span>
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

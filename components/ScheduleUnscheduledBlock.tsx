"use client";

import Link from "next/link";
import { CalendarX } from "lucide-react";

type UnscheduledJob = {
  id: string;
  title: string;
  status: string;
  customers: { name: string } | { name: string }[] | null;
};

type ScheduleUnscheduledBlockProps = {
  jobs: UnscheduledJob[];
};

export function ScheduleUnscheduledBlock({ jobs }: ScheduleUnscheduledBlockProps) {
  if (jobs.length === 0) return null;

  return (
    <section
      className="rounded-xl border border-dashed border-border bg-muted/20 px-3 py-3 sm:px-4"
      aria-label="Unscheduled jobs"
    >
      <div className="flex items-center gap-2">
        <CalendarX className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h2 className="text-sm font-semibold text-foreground">No schedule yet</h2>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {jobs.length} job{jobs.length !== 1 ? "s" : ""} not scheduled. Open a job to set date and time.
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {jobs.slice(0, 10).map((job) => {
          const customer = Array.isArray(job.customers) ? job.customers[0]?.name : job.customers?.name;
          return (
            <li key={job.id}>
              <Link
                href={`/jobs/${job.id}`}
                className="inline-flex items-center rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition touch-manipulation"
              >
                {job.title}
                {customer && <span className="ml-1.5 text-muted-foreground">({customer})</span>}
              </Link>
            </li>
          );
        })}
      </ul>
      {jobs.length > 10 && (
        <p className="mt-2 text-xs text-muted-foreground">
          and {jobs.length - 10} more — <Link href="/admin/jobs" className="underline hover:no-underline">view all jobs</Link>
        </p>
      )}
    </section>
  );
}

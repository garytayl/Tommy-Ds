import Link from "next/link";

import { JobStatusBadge } from "@/components/JobStatusBadge";
import { ScheduleCalendar } from "@/components/ScheduleCalendar";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";

const DAYS_AHEAD = 90;
const DAYS_PAST = 7;

export default async function SchedulePage() {
  const supabase = await createSupabaseServerClientForData();

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - DAYS_PAST);
  const end = new Date(start);
  end.setDate(end.getDate() + DAYS_PAST + DAYS_AHEAD);

  const { data: jobs } = await supabase
    .from("jobs")
    .select(
      "id,title,status,scheduled_start,scheduled_end,customers(name),profiles(full_name)",
    )
    .gte("scheduled_start", start.toISOString())
    .lt("scheduled_start", end.toISOString())
    .order("scheduled_start", { ascending: true, nullsFirst: false });

  type JobRow = {
    id: string;
    title: string;
    status: string;
    scheduled_start: string | null;
    scheduled_end: string | null;
    customers: { name: string } | { name: string }[] | null;
    profiles: { full_name: string | null } | { full_name: string | null }[] | null;
  };

  const rows = (jobs ?? []) as JobRow[];

  const byDate: Record<string, JobRow[]> = {};
  const jobsByDateCount: Record<string, number> = {};
  for (let d = 0; d < DAYS_PAST + DAYS_AHEAD; d++) {
    const date = new Date(start);
    date.setDate(date.getDate() + d);
    const key = date.toISOString().slice(0, 10);
    byDate[key] = [];
    jobsByDateCount[key] = 0;
  }
  for (const job of rows) {
    if (!job.scheduled_start) continue;
    const key = job.scheduled_start.slice(0, 10);
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(job);
    jobsByDateCount[key] = (jobsByDateCount[key] ?? 0) + 1;
  }

  const startDateStr = start.toISOString().slice(0, 10);
  const endDateStr = end.toISOString().slice(0, 10);
  const sortedDates = Object.keys(byDate).sort();

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Admin
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Schedule
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap a date on the calendar to jump to that day. Set times when creating or editing a job.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-3">
        <Link
          href="/admin/jobs#create"
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 touch-manipulation"
        >
          New job
        </Link>
        <Link
          href="/admin/jobs"
          className="inline-flex items-center rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted touch-manipulation"
        >
          All jobs
        </Link>
      </div>

      <ScheduleCalendar
        jobsByDate={jobsByDateCount}
        startDate={startDateStr}
        endDate={endDateStr}
      />

      <section className="space-y-4" aria-label="Jobs by day">
        {sortedDates.map((dateKey) => {
          const dayJobs = byDate[dateKey];
          const date = new Date(dateKey + "T12:00:00");
          const label = date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
          return (
            <div
              key={dateKey}
              id={`day-${dateKey}`}
              className="scroll-mt-4 rounded-xl border border-border bg-card overflow-hidden shadow-sm"
            >
              <div className="border-b border-border bg-muted/30 px-3 py-2.5 sm:px-5">
                <h2 className="text-sm font-semibold text-foreground">{label}</h2>
              </div>
              <ul className="divide-y divide-border">
                {dayJobs.length === 0 ? (
                  <li className="px-3 py-4 text-sm text-muted-foreground sm:px-5">
                    No jobs scheduled
                  </li>
                ) : (
                  dayJobs.map((job) => {
                    const customer = Array.isArray(job.customers)
                      ? job.customers[0]?.name
                      : job.customers?.name;
                    const installer = Array.isArray(job.profiles)
                      ? job.profiles[0]?.full_name
                      : job.profiles?.full_name;
                    return (
                      <li key={job.id}>
                        <Link
                          href={`/jobs/${job.id}`}
                          className="flex flex-col gap-1 px-3 py-3 transition hover:bg-muted/30 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1 sm:px-5"
                        >
                          <span className="font-medium text-foreground">
                            {job.title}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {job.scheduled_start
                              ? new Date(
                                  job.scheduled_start,
                                ).toLocaleTimeString([], {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </span>
                          {customer && (
                            <span className="text-sm text-muted-foreground">
                              {customer}
                            </span>
                          )}
                          {installer && (
                            <span className="text-xs text-muted-foreground">
                              {installer}
                            </span>
                          )}
                          <span className="mt-1 sm:mt-0 sm:ml-auto">
                            <JobStatusBadge status={job.status} />
                          </span>
                        </Link>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}

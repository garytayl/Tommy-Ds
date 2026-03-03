import Link from "next/link";

import { JobStatusBadge } from "@/components/JobStatusBadge";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DAYS_AHEAD = 14;

export default async function SchedulePage() {
  const supabase = await createSupabaseServerClient();

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + DAYS_AHEAD);

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
  for (let d = 0; d < DAYS_AHEAD; d++) {
    const date = new Date(start);
    date.setDate(date.getDate() + d);
    const key = date.toISOString().slice(0, 10);
    byDate[key] = [];
  }
  for (const job of rows) {
    if (!job.scheduled_start) continue;
    const key = job.scheduled_start.slice(0, 10);
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(job);
  }

  const sortedDates = Object.keys(byDate).sort();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Admin
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Schedule
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Jobs for the next {DAYS_AHEAD} days. Set times when creating or editing a job.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/jobs#create"
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95"
        >
          New job
        </Link>
        <Link
          href="/admin/jobs"
          className="inline-flex items-center rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          All jobs
        </Link>
      </div>

      <section className="space-y-6">
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
              className="rounded-xl border border-border bg-card overflow-hidden shadow-sm"
            >
              <div className="border-b border-border bg-muted/30 px-4 py-2.5 sm:px-5">
                <h2 className="text-sm font-semibold text-foreground">{label}</h2>
              </div>
              <ul className="divide-y divide-border">
                {dayJobs.length === 0 ? (
                  <li className="px-4 py-4 text-sm text-muted-foreground sm:px-5">
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
                          href={`/admin/jobs/${job.id}`}
                          className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 transition hover:bg-muted/30 sm:px-5"
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
                          <JobStatusBadge status={job.status} />
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

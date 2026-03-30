import Link from "next/link";

import { DevHint } from "@/components/DevHint";
import { JobStatusBadge } from "@/components/JobStatusBadge";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function TodayCommandCenterPage() {
  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const tomorrowEnd = new Date(todayStart);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 2);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [
    customersResult,
    jobsResult,
    invoicesResult,
    todayJobsResult,
    tomorrowJobsResult,
    weekJobsResult,
    noScheduleResult,
    recentJobsResult,
    invoicesDraftResult,
    completedJobsResult,
  ] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("jobs").select("id", { count: "exact", head: true }),
    supabase.from("invoices").select("id", { count: "exact", head: true }),
    supabase
      .from("jobs")
      .select("id,title,status,scheduled_start,scheduled_end,customers(name),profiles(full_name)")
      .gte("scheduled_start", todayStart.toISOString())
      .lt("scheduled_start", todayEnd.toISOString())
      .order("scheduled_start", { ascending: true, nullsFirst: false }),
    supabase
      .from("jobs")
      .select("id,title,status,scheduled_start,customers(name)")
      .gte("scheduled_start", todayEnd.toISOString())
      .lt("scheduled_start", tomorrowEnd.toISOString())
      .order("scheduled_start", { ascending: true })
      .limit(5),
    supabase
      .from("jobs")
      .select("id,title,status,scheduled_start,customers(name)")
      .gte("scheduled_start", todayStart.toISOString())
      .lt("scheduled_start", weekEnd.toISOString())
      .order("scheduled_start", { ascending: true })
      .limit(20),
    supabase
      .from("jobs")
      .select("id,title,status,customers(name)")
      .is("scheduled_start", null)
      .neq("status", "canceled")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("jobs")
      .select("id,title,status,scheduled_start,customers(name)")
      .order("scheduled_start", { ascending: true, nullsFirst: false })
      .limit(10),
    supabase.from("invoices").select("job_id").eq("status", "draft"),
    supabase
      .from("jobs")
      .select("id,title,status,customers(name)")
      .in("status", ["completed", "installed"])
      .order("updated_at", { ascending: false })
      .limit(30),
  ]);

  const draftJobIds = new Set((invoicesDraftResult.data ?? []).map((i) => i.job_id));
  const completedJobs = completedJobsResult.data ?? [];
  const completedWithBalance = await Promise.all(
    completedJobs.map(async (job: { id: string; title: string; status: string; customers: unknown }) => {
      const { data: inv } = await supabase
        .from("invoices")
        .select("balance_due_cents")
        .eq("job_id", job.id)
        .limit(1)
        .maybeSingle();
      return { ...job, balance_due_cents: inv?.balance_due_cents ?? 0 };
    }),
  );
  const completedUnpaid = completedWithBalance.filter((j: { balance_due_cents: number }) => j.balance_due_cents > 0);
  const noSchedule = (noScheduleResult.data ?? []) as { id: string; title: string; status: string; customers: unknown }[];

  type JobRow = {
    id: string;
    title: string;
    status: string;
    scheduled_start: string | null;
    scheduled_end?: string | null;
    customers: { name: string } | { name: string }[] | null;
    profiles?: { full_name: string | null } | { full_name: string | null }[] | null;
  };

  const todayJobs = (todayJobsResult.data ?? []) as JobRow[];
  const tomorrowJobs = (tomorrowJobsResult.data ?? []) as JobRow[];
  const weekJobs = (weekJobsResult.data ?? []) as JobRow[];
  const recentJobs = (recentJobsResult.data ?? []) as JobRow[];

  const cards = [
    { label: "Customers", value: customersResult.count ?? 0 },
    { label: "Jobs", value: jobsResult.count ?? 0 },
    { label: "Invoices", value: invoicesResult.count ?? 0 },
  ];

  const hasNoData = (customersResult.count ?? 0) === 0 && (jobsResult.count ?? 0) === 0;

  return (
    <div className="space-y-8">
      {hasNoData && (
        <div className="animate-fade-in-section rounded-xl border-2 border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            No data showing? Add the service role key so the app can read your DB.
          </p>
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">
            In <code className="rounded bg-amber-200/50 px-1 dark:bg-amber-900/50">.env.local</code> set{" "}
            <code className="rounded bg-amber-200/50 px-1 dark:bg-amber-900/50">SUPABASE_SERVICE_ROLE_KEY</code> (from
            Supabase Dashboard → Project Settings → API → <span className="font-medium">service_role</span> secret).
            Then restart the dev server and refresh. This bypasses RLS so seed data and new jobs show without logging in.
          </p>
        </div>
      )}
      <div className="animate-fade-in-section schedule-delay-0">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Command center
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Today
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Schedule, crew, and what needs attention.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 animate-fade-in-section schedule-delay-75">
        <DevHint message="Creates a job in public.jobs (customer_id, address, schedule). Form at /admin/jobs/new.">
          <Link
            href="/admin/jobs/new"
            className="inline-flex items-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all duration-200 hover:scale-105 hover:opacity-95 hover:shadow-lg active:scale-95"
          >
            New job
          </Link>
        </DevHint>
        <Link
          href="/admin/schedule"
          className="inline-flex items-center rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:scale-105 hover:bg-muted hover:shadow-sm active:scale-95"
        >
          Schedule
        </Link>
        <Link
          href="/admin/jobs"
          className="inline-flex items-center rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:scale-105 hover:bg-muted hover:shadow-sm active:scale-95"
        >
          All jobs
        </Link>
      </div>

      {/* Schedule strip: Today / Tomorrow / This week */}
      <section className="animate-card-in schedule-delay-150 rounded-2xl border border-border bg-card overflow-hidden shadow-lg shadow-black/5 transition-shadow duration-300 hover:shadow-xl">
        <div className="flex border-b border-border bg-muted/30">
          <div className="flex-1 border-r border-border px-4 py-2.5">
            <span className="text-xs font-medium text-muted-foreground">Today</span>
            <p className="text-lg font-semibold tabular-nums text-foreground">{todayJobs.length}</p>
          </div>
          <div className="flex-1 border-r border-border px-4 py-2.5">
            <span className="text-xs font-medium text-muted-foreground">Tomorrow</span>
            <p className="text-lg font-semibold tabular-nums text-foreground">{tomorrowJobs.length}</p>
          </div>
          <div className="flex-1 px-4 py-2.5">
            <span className="text-xs font-medium text-muted-foreground">This week</span>
            <p className="text-lg font-semibold tabular-nums text-foreground">{weekJobs.length}</p>
          </div>
        </div>
        <div className="divide-y divide-border">
          {todayJobs.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">No jobs scheduled today.</p>
          ) : (
            todayJobs.map((job) => {
              const customer = Array.isArray(job.customers) ? job.customers[0]?.name : job.customers?.name;
              const installer = Array.isArray(job.profiles) ? job.profiles[0]?.full_name : job.profiles?.full_name;
              return (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 transition-all duration-200 hover:bg-muted/30"
                >
                  <span className="font-medium text-foreground">{job.title}</span>
                  <span className="text-sm text-muted-foreground">
                    {job.scheduled_start
                      ? new Date(job.scheduled_start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                      : "—"}
                  </span>
                  {customer && <span className="text-sm text-muted-foreground">{customer}</span>}
                  {installer && <span className="text-xs text-muted-foreground">{installer}</span>}
                  <span className="ml-auto">
                    <JobStatusBadge status={job.status} />
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </section>

      {/* Hot list */}
      <section className="animate-card-in schedule-delay-225 rounded-2xl border border-border bg-card overflow-hidden shadow-lg shadow-black/5 transition-shadow duration-300 hover:shadow-xl">
        <div className="border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
          <h2 className="text-lg font-semibold text-foreground">Need attention</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            No schedule, invoice draft, or completed but not paid.
          </p>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-muted/20 p-4 transition-all duration-200 hover:shadow-md hover:bg-muted/30">
            <Link href="/admin/jobs" className="font-medium text-foreground transition-colors hover:underline">
              No schedule
            </Link>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{noSchedule.length}</p>
            <ul className="mt-2 space-y-1">
              {noSchedule.slice(0, 3).map((j) => (
                <li key={j.id}>
                  <Link href={`/jobs/${j.id}`} className="text-sm text-muted-foreground hover:text-foreground">
                    {j.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-4 transition-all duration-200 hover:shadow-md hover:bg-muted/30">
            <Link href="/admin/invoices" className="font-medium text-foreground transition-colors hover:underline">
              Invoice draft
            </Link>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{draftJobIds.size}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-4 transition-all duration-200 hover:shadow-md hover:bg-muted/30">
            <Link href="/admin/jobs" className="font-medium text-foreground transition-colors hover:underline">
              Completed, unpaid
            </Link>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{completedUnpaid.length}</p>
            <ul className="mt-2 space-y-1">
              {completedUnpaid.slice(0, 3).map((j) => (
                <li key={j.id}>
                  <Link href={`/jobs/${j.id}`} className="text-sm text-muted-foreground hover:text-foreground">
                    {j.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {cards.map((card, i) => (
          <div
            key={card.label}
            className="animate-card-in group rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/5 transition-all duration-300 hover:shadow-xl"
            style={{ animationDelay: `${300 + i * 80}ms` }}
          >
            <span className="block h-1 w-12 rounded-full bg-primary/80 transition-all duration-200 group-hover:bg-primary" />
            <p className="mt-3 text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {card.value}
            </p>
          </div>
        ))}
      </section>

      <section className="animate-card-in schedule-delay-500 rounded-2xl border border-border bg-card overflow-hidden shadow-lg shadow-black/5 transition-shadow duration-300 hover:shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
          <h2 className="text-lg font-semibold text-foreground">Recent jobs</h2>
          <Link
            href="/admin/jobs"
            className="inline-flex items-center rounded-xl bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:scale-105 hover:opacity-95 hover:shadow active:scale-95"
          >
            View all jobs
          </Link>
        </div>
        <div className="table-wrap overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="table-header py-3 pl-5 pr-4">Job</th>
                <th className="table-header py-3 pr-4">Customer</th>
                <th className="table-header py-3 pr-4">Scheduled</th>
                <th className="table-header py-3 pr-5">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentJobs.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No jobs yet.{" "}
                    <Link href="/admin/jobs/new" className="link">
                      Create a job
                    </Link>{" "}
                    to get started.
                  </td>
                </tr>
              ) : (
                recentJobs.map((job) => {
                  const customer = Array.isArray(job.customers)
                    ? job.customers[0]?.name
                    : job.customers?.name;
                  return (
                    <tr
                      key={job.id}
                      className="border-b border-border transition-all duration-200 hover:bg-muted/30"
                    >
                      <td className="py-3 pl-5 pr-4">
                        <Link href={`/jobs/${job.id}`} className="link font-medium">
                          {job.title}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {customer ?? "-"}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {job.scheduled_start
                          ? new Date(job.scheduled_start).toLocaleString()
                          : "Unscheduled"}
                      </td>
                      <td className="py-3 pr-5">
                        <JobStatusBadge status={job.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

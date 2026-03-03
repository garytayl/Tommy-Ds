import Link from "next/link";

import { JobStatusBadge } from "@/components/JobStatusBadge";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();

  const [customersResult, jobsResult, invoicesResult, recentJobsResult] =
    await Promise.all([
      supabase.from("customers").select("id", { count: "exact", head: true }),
      supabase.from("jobs").select("id", { count: "exact", head: true }),
      supabase.from("invoices").select("id", { count: "exact", head: true }),
      supabase
        .from("jobs")
        .select("id,title,status,scheduled_start,customers(name)")
        .order("scheduled_start", { ascending: true, nullsFirst: false })
        .limit(10),
    ]);

  const cards = [
    { label: "Customers", value: customersResult.count ?? 0 },
    { label: "Jobs", value: jobsResult.count ?? 0 },
    { label: "Invoices", value: invoicesResult.count ?? 0 },
  ];

  type RecentJobRow = {
    id: string;
    title: string;
    status: string;
    scheduled_start: string | null;
    customers: { name: string } | { name: string }[] | null;
  };

  const recentJobs = (recentJobsResult.data ?? []) as RecentJobRow[];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Admin
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live snapshot of customers, jobs, and invoices.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/jobs#create"
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95"
        >
          New job
        </Link>
        <Link
          href="/admin/schedule"
          className="inline-flex items-center rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          View schedule
        </Link>
        <Link
          href="/admin/customers"
          className="inline-flex items-center rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          Customers
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="group rounded-xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md"
          >
            <span className="block h-1 w-12 rounded-full bg-primary/80 group-hover:bg-primary" />
            <p className="mt-3 text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {card.value}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
          <h2 className="text-lg font-semibold text-foreground">Recent Jobs</h2>
          <Link
            href="/admin/jobs"
            className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:opacity-95"
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
                    <Link href="/admin/jobs#create" className="link">
                      Create a job
                    </Link>{" "}
                    to get started. Then open the job to add an invoice and set prices.
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
                      className="border-b border-border transition hover:bg-muted/30"
                    >
                      <td className="py-3 pl-5 pr-4">
                        <Link
                          href={`/admin/jobs/${job.id}`}
                          className="link font-medium"
                        >
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

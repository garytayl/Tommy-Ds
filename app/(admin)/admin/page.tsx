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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--foreground)" }}>
          Dashboard
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Live snapshot of customers, jobs, and invoices.
        </p>
      </div>
      <section className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="card p-5">
            <p className="text-sm" style={{ color: "var(--muted)" }}>{card.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>
              {card.value}
            </p>
          </div>
        ))}
      </section>

      <section className="card overflow-hidden p-0">
        <div className="flex items-center justify-between border-b p-4" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>Recent Jobs</h2>
          <Link href="/admin/jobs" className="btn-primary px-3 py-1.5 text-sm">
            View all jobs
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-[var(--muted-bg)]" style={{ borderColor: "var(--border)" }}>
                <th className="table-header py-3 pl-5 pr-4">Job</th>
                <th className="table-header py-3 pr-4">Customer</th>
                <th className="table-header py-3 pr-4">Scheduled</th>
                <th className="table-header py-3 pr-5">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentJobs.map((job) => {
                const customer = Array.isArray(job.customers)
                  ? job.customers[0]?.name
                  : job.customers?.name;
                return (
                  <tr key={job.id} className="border-b transition hover:bg-[var(--muted-bg)]/50" style={{ borderColor: "var(--border)" }}>
                    <td className="py-3 pl-5 pr-4">
                      <Link href={`/admin/jobs/${job.id}`} className="link font-medium">
                        {job.title}
                      </Link>
                    </td>
                    <td className="py-3 pr-4" style={{ color: "var(--muted)" }}>{customer ?? "-"}</td>
                    <td className="py-3 pr-4" style={{ color: "var(--muted)" }}>
                      {job.scheduled_start
                        ? new Date(job.scheduled_start).toLocaleString()
                        : "Unscheduled"}
                    </td>
                    <td className="py-3 pr-5">
                      <JobStatusBadge status={job.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

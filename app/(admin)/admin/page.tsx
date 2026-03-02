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
      <section className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border bg-white p-4">
            <p className="text-sm text-zinc-600">{card.label}</p>
            <p className="text-2xl font-semibold">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Jobs</h2>
          <Link
            href="/admin/jobs"
            className="rounded bg-black px-3 py-1 text-sm text-white"
          >
            View all jobs
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-zinc-500">
                <th className="py-2 pr-4">Job</th>
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Scheduled</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentJobs.map((job) => {
                const customer = Array.isArray(job.customers)
                  ? job.customers[0]?.name
                  : job.customers?.name;
                return (
                  <tr key={job.id} className="border-b last:border-none">
                    <td className="py-2 pr-4">
                      <Link
                        href={`/admin/jobs/${job.id}`}
                        className="font-medium text-blue-700 hover:underline"
                      >
                        {job.title}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">{customer ?? "-"}</td>
                    <td className="py-2 pr-4">
                      {job.scheduled_start
                        ? new Date(job.scheduled_start).toLocaleString()
                        : "Unscheduled"}
                    </td>
                    <td className="py-2 pr-4">
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

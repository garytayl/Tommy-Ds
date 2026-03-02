import Link from "next/link";

import { JobStatusBadge } from "@/components/JobStatusBadge";
import { formatCents } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function InstallerJobsTodayPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="card p-4 text-sm text-zinc-600">
        Sign in as an installer to view assigned jobs.
      </div>
    );
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const { data: jobs } = await supabase
    .from("jobs")
    .select(
      "id,title,status,address_line1,city,state,zip,scheduled_start,invoices(id,status,balance_due_cents)",
    )
    .eq("assigned_installer_id", user.id)
    .gte("scheduled_start", start.toISOString())
    .lt("scheduled_start", end.toISOString())
    .order("scheduled_start", { ascending: true });

  type InstallerJob = {
    id: string;
    title: string;
    status: string;
    address_line1: string;
    city: string;
    state: string;
    zip: string;
    scheduled_start: string | null;
    invoices:
      | { id: string; status: string; balance_due_cents: number }[]
      | { id: string; status: string; balance_due_cents: number }
      | null;
  };

  const rows = (jobs ?? []) as InstallerJob[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Jobs Today</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Assigned jobs for the current day.
        </p>
      </div>
      {rows.length === 0 ? (
        <div className="card p-4 text-sm text-zinc-600">
          No jobs scheduled today.
        </div>
      ) : (
        rows.map((job) => {
          const invoice = Array.isArray(job.invoices)
            ? job.invoices[0]
            : job.invoices;

          return (
            <Link
              key={job.id}
              href={`/m/jobs/${job.id}`}
              className="card block p-4 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-medium">{job.title}</h2>
                <JobStatusBadge status={job.status} />
              </div>
              <p className="text-sm text-zinc-600">
                {job.address_line1}, {job.city}, {job.state} {job.zip}
              </p>
              <div className="mt-2 flex items-center justify-between text-sm">
                <p>
                  {job.scheduled_start
                    ? new Date(job.scheduled_start).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "No time set"}
                </p>
                <p className="font-medium">
                  {invoice
                    ? `Balance: ${formatCents(invoice.balance_due_cents)}`
                    : "No invoice"}
                </p>
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}

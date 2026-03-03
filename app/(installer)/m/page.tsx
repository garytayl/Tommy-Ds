import Link from "next/link";

import { JobStatusBadge } from "@/components/JobStatusBadge";
import { formatCents } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function InstallerJobsTodayPage() {
  const supabase = await createSupabaseServerClient();

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const { data: jobs } = await supabase
    .from("jobs")
    .select(
      "id,title,status,address_line1,city,state,zip,scheduled_start,invoices(id,status,balance_due_cents)",
    )
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
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--foreground)" }}>
          My Jobs Today
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Jobs scheduled for today (PoC: all jobs shown).
        </p>
      </div>
      {rows.length === 0 ? (
        <div className="card p-8 text-center" style={{ color: "var(--muted)" }}>
          No jobs scheduled today.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((job) => {
            const invoice = Array.isArray(job.invoices)
              ? job.invoices[0]
              : job.invoices;

            return (
              <li key={job.id}>
                <Link
                  href={`/m/jobs/${job.id}`}
                  className="card block p-4 transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="font-semibold" style={{ color: "var(--foreground)" }}>{job.title}</h2>
                    <JobStatusBadge status={job.status} />
                  </div>
                  <p className="text-sm" style={{ color: "var(--muted)" }}>
                    {job.address_line1}, {job.city}, {job.state} {job.zip}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <p style={{ color: "var(--muted)" }}>
                      {job.scheduled_start
                        ? new Date(job.scheduled_start).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "No time set"}
                    </p>
                    <p className="font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>
                      {invoice
                        ? `Balance: ${formatCents(invoice.balance_due_cents)}`
                        : "No invoice"}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

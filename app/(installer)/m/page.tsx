import Link from "next/link";

import { JobStatusBadge } from "@/components/JobStatusBadge";
import { formatCents } from "@/lib/money";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";

export default async function InstallerTodayPage() {
  const supabase = await createSupabaseServerClientForData();

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const { data: jobs } = await supabase
    .from("jobs")
    .select(
      "id,title,status,notes,address_line1,city,state,zip,scheduled_start,customers(name,phone),invoices(id,status,balance_due_cents)",
    )
    .gte("scheduled_start", start.toISOString())
    .lt("scheduled_start", end.toISOString())
    .order("scheduled_start", { ascending: true });

  type InstallerJob = {
    id: string;
    title: string;
    status: string;
    notes: string | null;
    address_line1: string;
    city: string;
    state: string;
    zip: string;
    scheduled_start: string | null;
    customers: { name: string; phone: string | null } | { name: string; phone: string | null }[] | null;
    invoices:
      | { id: string; status: string; balance_due_cents: number }[]
      | { id: string; status: string; balance_due_cents: number }
      | null;
  };

  const rows = (jobs ?? []) as InstallerJob[];
  const nextJob = rows[0];
  const mapQuery = nextJob
    ? encodeURIComponent(`${nextJob.address_line1}, ${nextJob.city}, ${nextJob.state} ${nextJob.zip}`)
    : "";

  return (
    <div className="space-y-6 pb-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Field</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Today
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your jobs for today. Open a job to start, add notes, photos, and collect payment.
        </p>
      </div>

      {nextJob && (
        <div className="rounded-xl border-2 border-primary/30 bg-card p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Next job</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">{nextJob.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {nextJob.address_line1}, {nextJob.city}, {nextJob.state} {nextJob.zip}
          </p>
          {(() => {
            const customer = Array.isArray(nextJob.customers) ? nextJob.customers[0] : nextJob.customers;
            const phone = customer?.phone;
            const invoice = Array.isArray(nextJob.invoices) ? nextJob.invoices[0] : nextJob.invoices;
            return (
              <>
                {phone && (
                  <p className="mt-2 text-sm">
                    <a href={`tel:${phone.replace(/\D/g, "")}`} className="link font-medium">
                      {phone}
                    </a>
                  </p>
                )}
                {nextJob.notes && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{nextJob.notes}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/jobs/${nextJob.id}`}
                    className="inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95"
                  >
                    Open job
                  </Link>
                  <a
                    href={`https://maps.google.com/?q=${mapQuery}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
                  >
                    Navigate
                  </a>
                  {invoice && invoice.balance_due_cents > 0 && (
                    <Link
                      href={`/jobs/${nextJob.id}?tab=payments`}
                      className="inline-flex rounded-lg border border-primary bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary"
                    >
                      Collect {formatCents(invoice.balance_due_cents)}
                    </Link>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground shadow-sm">
          No jobs scheduled today.
        </div>
      ) : (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">All today&apos;s jobs</h2>
          <ul className="space-y-3">
            {rows.map((job) => {
              const invoice = Array.isArray(job.invoices) ? job.invoices[0] : job.invoices;
              return (
                <li key={job.id}>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="block rounded-xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-semibold text-foreground">{job.title}</h3>
                      <JobStatusBadge status={job.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {job.address_line1}, {job.city}, {job.state} {job.zip}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <p className="text-muted-foreground">
                        {job.scheduled_start
                          ? new Date(job.scheduled_start).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          : "No time set"}
                      </p>
                      <p className="font-semibold tabular-nums text-foreground">
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
        </div>
      )}
    </div>
  );
}

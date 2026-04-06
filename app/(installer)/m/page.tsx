import Link from "next/link";

import { JobStatusBadge } from "@/components/JobStatusBadge";
import { formatCents } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function InstallerTodayPage() {
  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 8);

  const [todayResult, upcomingResult] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        "id,title,status,notes,address_line1,city,state,zip,scheduled_start,customers(name,phone),invoices(id,invoice_number,status,balance_due_cents)",
      )
      .gte("scheduled_start", todayStart.toISOString())
      .lt("scheduled_start", todayEnd.toISOString())
      .order("scheduled_start", { ascending: true }),
    supabase
      .from("jobs")
      .select(
        "id,title,status,notes,address_line1,city,state,zip,scheduled_start,customers(name,phone),invoices(id,invoice_number,status,balance_due_cents)",
      )
      .gte("scheduled_start", todayStart.toISOString())
      .lt("scheduled_start", weekEnd.toISOString())
      .order("scheduled_start", { ascending: true })
      .limit(20),
  ]);

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
      | { id: string; invoice_number: number; status: string; balance_due_cents: number }[]
      | { id: string; invoice_number: number; status: string; balance_due_cents: number }
      | null;
  };

  const todayJobs = (todayResult.data ?? []) as InstallerJob[];
  const upcomingJobs = (upcomingResult.data ?? []) as InstallerJob[];
  const rows = todayJobs.length > 0 ? todayJobs : upcomingJobs;
  const nextJob = rows[0];
  const mapQuery = nextJob
    ? encodeURIComponent(`${nextJob.address_line1}, ${nextJob.city}, ${nextJob.state} ${nextJob.zip}`)
    : "";

  return (
    <div className="space-y-6 pb-6">
      <div className="animate-fade-in-section schedule-delay-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          My jobs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {todayJobs.length > 0
            ? "Today and upcoming. Tap a job to open it, add notes, and upload photos."
            : "Your assigned jobs for today and the next week. Tap a job to open it."}
        </p>
      </div>

      <div className="animate-fade-in-section schedule-delay-75 rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Billing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Open any job and use the Billing section to create and send a pay link.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {nextJob ? (
            <Link href={`/m/jobs/${nextJob.id}`} className="btn-primary">
              Open billing on next job
            </Link>
          ) : (
            <Link href="/m" className="btn-secondary">
              No assigned jobs yet
            </Link>
          )}
        </div>
      </div>

      {nextJob && (
        <div className="animate-card-in schedule-delay-75 rounded-2xl border-2 border-primary/30 bg-card p-5 shadow-lg shadow-black/5 transition-shadow duration-300 hover:shadow-xl">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Next</p>
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
                    href={`/m/jobs/${nextJob.id}`}
                    className="inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all duration-200 hover:scale-105 hover:opacity-95 hover:shadow-lg active:scale-95"
                  >
                    Open job
                  </Link>
                  <a
                    href={`https://maps.google.com/?q=${mapQuery}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:scale-105 hover:bg-muted hover:shadow-sm active:scale-95"
                  >
                    Navigate
                  </a>
                  {invoice && invoice.balance_due_cents > 0 && (
                    <span className="inline-flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
                      {formatCents(invoice.balance_due_cents)} due
                    </span>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="animate-fade-in-section schedule-delay-150 rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground shadow-lg transition-shadow duration-200 hover:shadow-xl">
          No jobs assigned for today or the next week.
        </div>
      ) : (
        <div className="animate-fade-in-section schedule-delay-150">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            {todayJobs.length > 0 ? "All today's jobs" : "Upcoming (next 7 days)"}
          </h2>
          <ul className="space-y-3">
            {rows.map((job) => {
              const invoice = Array.isArray(job.invoices) ? job.invoices[0] : job.invoices;
              return (
                <li key={job.id} className="rounded-2xl border border-border bg-card shadow-lg shadow-black/5 overflow-hidden transition-all duration-200 hover:shadow-xl">
                  <Link
                    href={`/m/jobs/${job.id}`}
                    className="block p-4 transition-all duration-200 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                          ? `Inv #${invoice.invoice_number} · ${formatCents(invoice.balance_due_cents)} due`
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

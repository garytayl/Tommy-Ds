import Link from "next/link";
import { notFound } from "next/navigation";

import { JobStatusBadge } from "@/components/JobStatusBadge";
import { SubmitButton } from "@/components/SubmitButton";
import { formatCents } from "@/lib/money";
import { workflowStageLabel } from "@/lib/quote-workflow";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { deleteCustomer, updateCustomer } from "./actions";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: customer }, { data: jobs }, { data: quotes }] = await Promise.all([
    supabase
      .from("customers")
      .select("id,name,phone,email,address_line1,address_line2,city,state,zip,created_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("jobs")
      .select("id,title,status,scheduled_start")
      .eq("customer_id", id)
      .order("scheduled_start", { ascending: true, nullsFirst: false }),
    supabase
      .from("quotes")
      .select("id,title,status,workflow_stage,total_cents,job_id,created_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!customer) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Customer Detail</h1>
          <Link href="/admin/customers" className="link text-sm">
            Back to customers
          </Link>
        </div>
        <form action={updateCustomer} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="customer_id" value={id} />
          <input
            type="text"
            name="name"
            required
            defaultValue={customer.name}
            className="field"
          />
          <input
            type="text"
            name="phone"
            defaultValue={customer.phone ?? ""}
            className="field"
          />
          <input
            type="email"
            name="email"
            defaultValue={customer.email ?? ""}
            className="field sm:col-span-2"
          />
          <div className="sm:col-span-2 mt-1 border-t border-border pt-4">
            <h2 className="text-sm font-semibold text-foreground">Customer address</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Billing or mailing address for this contact. Project and job site addresses are set per estimate or job.
            </p>
          </div>
          <input
            type="text"
            name="address_line1"
            placeholder="Address line 1"
            defaultValue={customer.address_line1 ?? ""}
            className="field sm:col-span-2"
          />
          <input
            type="text"
            name="address_line2"
            placeholder="Address line 2 (optional)"
            defaultValue={customer.address_line2 ?? ""}
            className="field sm:col-span-2"
          />
          <input
            type="text"
            name="city"
            placeholder="City"
            defaultValue={customer.city ?? ""}
            className="field"
          />
          <input
            type="text"
            name="state"
            placeholder="State"
            defaultValue={customer.state ?? ""}
            className="field"
          />
          <input
            type="text"
            name="zip"
            placeholder="ZIP"
            defaultValue={customer.zip ?? ""}
            className="field"
          />
          <div className="sm:col-span-2 flex items-center gap-2">
            <SubmitButton>Save customer</SubmitButton>
          </div>
        </form>
        <form action={deleteCustomer} className="mt-3">
          <input type="hidden" name="customer_id" value={id} />
          <SubmitButton variant="danger" pendingLabel="Deleting…">
            Delete customer
          </SubmitButton>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/50 px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">Estimates &amp; quotes</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Estimate → formal quote → job. Open a row to promote or convert.
            </p>
          </div>
          <Link href={`/admin/quotes/new?customer_id=${id}`} className="btn-secondary text-sm">
            New estimate
          </Link>
        </div>
        <div className="table-wrap overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="table-header py-3 pl-5 pr-4">Title</th>
                <th className="table-header py-3 pr-4">Stage</th>
                <th className="table-header py-3 pr-4">Total</th>
                <th className="table-header py-3 pr-4">Status</th>
                <th className="table-header py-3 pr-5">Job</th>
              </tr>
            </thead>
            <tbody>
              {(quotes ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-muted-foreground">
                    No estimates yet. Add one before scheduling work.
                  </td>
                </tr>
              )}
              {(quotes ?? []).map((q) => (
                <tr key={q.id} className="border-b border-border transition hover:bg-muted/30">
                  <td className="py-3 pl-5 pr-4">
                    <Link href={`/admin/quotes/${q.id}`} className="link font-medium">
                      {q.title}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    {q.job_id ? "Job" : workflowStageLabel((q as { workflow_stage?: string }).workflow_stage)}
                  </td>
                  <td className="py-3 pr-4 tabular-nums">{formatCents(q.total_cents)}</td>
                  <td className="py-3 pr-4 capitalize text-muted-foreground">{q.status}</td>
                  <td className="py-3 pr-5">
                    {q.job_id ? (
                      <Link href={`/jobs/${q.job_id}`} className="link text-sm">
                        Open job
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="border-b border-border bg-muted/50 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-foreground">Jobs</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Jobs appear after you convert a formal quote or create a job manually.
          </p>
        </div>
        <div className="table-wrap overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="table-header py-3 pl-5 pr-4">Title</th>
                <th className="table-header py-3 pr-4">Scheduled</th>
                <th className="table-header py-3 pr-5">Status</th>
              </tr>
            </thead>
            <tbody>
              {(jobs ?? []).length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-6 text-muted-foreground">
                    No jobs for this customer yet.
                  </td>
                </tr>
              )}
              {(jobs ?? []).map((job) => (
                <tr key={job.id} className="border-b border-border transition hover:bg-muted/30">
                  <td className="py-3 pl-5 pr-4">
                    <Link href={`/jobs/${job.id}`} className="link font-medium">
                      {job.title}
                    </Link>
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
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

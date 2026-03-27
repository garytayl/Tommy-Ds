import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { JobStatusBadge } from "@/components/JobStatusBadge";
import { SubmitButton } from "@/components/SubmitButton";
import { formatCents } from "@/lib/money";
import { setToastCookie } from "@/lib/toast";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClientForData();

  const [{ data: customer }, { data: jobs }, { data: quotes }] = await Promise.all([
    supabase
      .from("customers")
      .select("id,name,phone,email,created_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("jobs")
      .select("id,title,status,scheduled_start")
      .eq("customer_id", id)
      .order("scheduled_start", { ascending: true, nullsFirst: false }),
    supabase
      .from("quotes")
      .select("id,title,status,total_cents,job_id,created_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!customer) {
    notFound();
  }

  async function updateCustomer(formData: FormData) {
    "use server";

    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();

    if (!name) return;

    const supabase = await createSupabaseServerClientForData();
    await supabase
      .from("customers")
      .update({
        name,
        phone: phone || null,
        email: email || null,
      })
      .eq("id", id);

    await setToastCookie("Customer saved");
    revalidatePath(`/admin/customers/${id}`);
    revalidatePath("/admin/customers");
  }

  async function deleteCustomer() {
    "use server";
    const supabase = await createSupabaseServerClientForData();
    await supabase.from("customers").delete().eq("id", id);
    revalidatePath("/admin/customers");
    redirect("/admin/customers");
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
        <form action={updateCustomer} className="grid gap-3 sm:grid-cols-3">
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
            className="field"
          />
          <div className="sm:col-span-3 flex items-center gap-2">
            <SubmitButton>Save customer</SubmitButton>
          </div>
        </form>
        <form action={deleteCustomer} className="mt-3">
          <SubmitButton variant="danger" pendingLabel="Deleting…">Delete customer</SubmitButton>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/50 px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">Quotes &amp; estimates</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Estimates live here until you convert one to a job.
            </p>
          </div>
          <Link href={`/admin/quotes/new?customer_id=${id}`} className="btn-secondary text-sm">
            New quote
          </Link>
        </div>
        <div className="table-wrap overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="table-header py-3 pl-5 pr-4">Title</th>
                <th className="table-header py-3 pr-4">Total</th>
                <th className="table-header py-3 pr-4">Status</th>
                <th className="table-header py-3 pr-5">Job</th>
              </tr>
            </thead>
            <tbody>
              {(quotes ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-muted-foreground">
                    No quotes yet. Create an estimate before scheduling work.
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
            Jobs appear after you schedule work or convert an accepted quote.
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
